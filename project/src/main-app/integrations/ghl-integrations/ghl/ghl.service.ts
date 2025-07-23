import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { GhlSubaccountsResponse } from '../dto/ghl-integration-config.dto';

@Injectable()
export class GhlService {
  private readonly logger = new Logger(GhlService.name);
  
  // This would typically come from environment variables
  private readonly apiKey = process.env.GHL_API_KEY || 'your-api-key';
  private readonly baseUrl = 'https://rest.gohighlevel.com/v1';

  /**
   * Search for GoHighLevel subaccounts (locations)
   * @returns List of subaccounts/locations from GoHighLevel API
   */
  async searchSubaccounts(): Promise<GhlSubaccountsResponse> {
    try {
      this.logger.log('Fetching subaccounts from GoHighLevel API');
      
      const response = await axios.get(`${this.baseUrl}/locations`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data as GhlSubaccountsResponse;
    } catch (error) {
      this.logger.error(`Error fetching subaccounts: ${error.message}`);
      throw new HttpException(
        'Failed to fetch subaccounts from GoHighLevel API', 
        HttpStatus.BAD_GATEWAY
      );
    }
  }
}
