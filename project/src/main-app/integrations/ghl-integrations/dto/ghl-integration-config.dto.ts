import { IsString, IsOptional } from 'class-validator';

/**
 * GoHighLevel Integration Configuration DTO
 * Defines the structure for GHL integration config with proper typing for locationId
 */
export class GhlIntegrationConfigDto {
  @IsString()
  apiKey: string;

  @IsString()
  locationId: string; // GHL Subaccount/Location ID

  @IsString()
  @IsOptional()
  calendarId?: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;
}

/**
 * GoHighLevel Subaccount/Location interface
 * Represents a GHL subaccount/location as returned by the GHL API
 */
export interface GhlSubaccount {
  id: string; // This is the locationId used in webhooks
  name: string;
  email?: string;
  companyId?: string;
  address?: string;
  phone?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  isActive?: boolean;
}

/**
 * GoHighLevel API Response for subaccounts/locations
 */
export interface GhlSubaccountsResponse {
  locations?: GhlSubaccount[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * GoHighLevel Contact interface
 * Represents a contact as received in webhook payloads
 */
export interface GhlContact {
  id: string;
  locationId: string; // GHL Subaccount ID
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GoHighLevel Message interface
 * Represents a message as received in webhook payloads
 */
export interface GhlMessage {
  contactId: string;
  messageType?: 'SMS' | 'Email' | 'Live Chat' | 'GMB' | 'Call' | 'Voicemail';
  body?: string;
  subject?: string;
  from?: string;
  to?: string;
  direction?: 'inbound' | 'outbound';
  status?: string;
  timestamp?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
} 