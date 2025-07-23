import { IsString, IsOptional } from 'class-validator';

export class OutboundMessageDto {
  @IsString()
  contactId: string; // GHL Contact ID (maps to customId in Lead model)

  @IsString()
  @IsOptional()
  messageType?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
