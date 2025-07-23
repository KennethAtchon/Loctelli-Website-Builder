import { IsString, IsOptional, IsBoolean, IsObject, IsUrl } from 'class-validator';

export class CreateIntegrationTemplateDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsObject()
  configSchema: Record<string, any>;

  @IsOptional()
  @IsString()
  setupInstructions?: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  apiVersion?: string;
} 