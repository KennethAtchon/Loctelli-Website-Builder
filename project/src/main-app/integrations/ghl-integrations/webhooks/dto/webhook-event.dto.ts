import { IsString, IsObject, IsOptional } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  type: string;

  @IsString()
  source: string;

  @IsObject()
  payload: Record<string, any>;

  @IsString()
  @IsOptional()
  signature?: string;
}
