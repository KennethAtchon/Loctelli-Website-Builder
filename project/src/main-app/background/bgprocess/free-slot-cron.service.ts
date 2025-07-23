import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { addDays } from 'date-fns';

interface GhlLocation {
  id: string;
  name: string;
  email?: string;
}

interface GhlSubaccountsResponse {
  locations?: GhlLocation[];
}

interface UserData {
  name: string;
  company: string;
  email?: string;
  locationId?: string;
  [key: string]: any;
}

interface User {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  budget: string | null;
  bookingsTime: any;
  bookingEnabled: number;
  calendarId: string | null;
  locationId: string | null;
  assignedUserId: string | null;
}

@Injectable()
export class FreeSlotCronService {
  private readonly logger = new Logger(FreeSlotCronService.name);
  private readonly ghlApiKey: string;
  private readonly ghlApiVersion: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ghlApiKey = this.configService.get<string>('GHL_API_KEY') || '';
    this.ghlApiVersion = this.configService.get<string>(
      'GHL_API_VERSION',
      '2021-04-15',
    );
  }

  /**
   * Import users from GoHighLevel subaccounts (locations) and create a user for each subaccount.
   * This is the background-process version of the /import-ghl-users endpoint.
   * DEPRECATED: This is not needed anymore, this won't provide us the API key which is needed for automations
   */
  async importGhlUsersBg(): Promise<User[]> {
    try {
      // Get typed response from GoHighLevel API
      const response = await this.searchGohighlevelSubaccounts();
      if (!response || !response.locations || response.locations.length === 0) {
        this.logger.warn(
          '[importGhlUsersBg] Failed to fetch subaccounts from GoHighLevel API',
        );
        return [];
      }

      const createdUsers: User[] = [];
      for (const location of response.locations) {
        // Create user data with proper fields from the location
        const userData: UserData = {
          name: location.name,
          company: location.name, // Use location name as company since companyId doesn't exist
          email: location.email,
          locationId: location.id, // Set the locationId field
        };

        // Prevent duplicates by checking if user with same email or locationId exists
        let existingUser: User | null = null;
        if (userData.email) {
          existingUser = (await this.prisma.user.findFirst({
            where: { email: userData.email },
          })) as User | null;
        }

        if (!existingUser && userData.locationId) {
          existingUser = (await this.prisma.user.findFirst({
            where: { locationId: userData.locationId },
          })) as User | null;
        }

        if (existingUser) {
          // Update existing user's locationId if needed
          if (!existingUser.locationId && userData.locationId) {
            await this.prisma.user.update({
              where: { id: existingUser.id },
              data: { locationId: userData.locationId } as any,
            });
          }
          continue;
        }

        // Create new user
        const dbUser = (await this.prisma.user.create({
          data: userData as any,
        })) as User;

        createdUsers.push(dbUser);
      }

      this.logger.log(
        `[importGhlUsersBg] Imported ${createdUsers.length} users from GoHighLevel.`,
      );
      return createdUsers;
    } catch (error) {
      this.logger.error(`[importGhlUsersBg] Error importing users: ${error}`);
      return [];
    }
  }

  /**
   * Search for GoHighLevel subaccounts (locations)
   * DEPRECATED: This is not needed anymore, this won't provide us the API key which is needed for automations
   */
  private async searchGohighlevelSubaccounts(): Promise<GhlSubaccountsResponse> {
    try {
      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${this.ghlApiKey}`,
        Version: this.ghlApiVersion,
      };

      const url = 'https://services.leadconnectorhq.com/locations/';
      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        return response.data;
      }

      return {};
    } catch (error) {
      this.logger.error(`Error fetching subaccounts: ${error}`);
      return {};
    }
  }

  /**
   * Fetch free slots from GoHighLevel for each user with a calendarId
   */
  async fetchFreeSlots(): Promise<void> {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.ghlApiKey}`,
      Version: this.ghlApiVersion,
    };

    try {
      const users = await this.prisma.user.findMany();

      for (const user of users) {
        const calendarId = user.calendarId;
        if (!calendarId) {
          this.logger.debug(
            `[${new Date().toISOString()}] Skipping userId=${user.id}: no calendarId.`,
          );
          continue;
        }

        // Calculate 1 day from now to 8 days from now (in ms since epoch)
        const now = new Date();
        const startDt = addDays(now, 1);
        const endDt = addDays(now, 8);
        const startMs = startDt.getTime();
        const endMs = endDt.getTime();

        const params = {
          startDate: startMs,
          endDate: endMs,
        };

        const url = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots`;

        try {
          const response = await axios.get(url, { headers, params });

          if (response.status === 200) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { bookingsTime: response.data } as any,
            });

            this.logger.log(
              `[${new Date().toISOString()}] Updated bookingsTime for userId=${user.id} (calendarId=${calendarId})`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[${new Date().toISOString()}] Error fetching slots for userId=${user.id}, calendarId=${calendarId}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[${new Date().toISOString()}] Error updating user bookingsTime: ${error}`,
      );
    }
  }

  /**
   * Run background processes on schedule
   * DISABLED: Cron jobs temporarily disabled
   */
  // @Cron(CronExpression.EVERY_HOUR)
  // async handleCronTasks() {
  //   this.logger.log('Running scheduled background tasks');
  //   await this.importGhlUsersBg();
  //   await this.fetchFreeSlots();
  // }
}
