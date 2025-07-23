import { IsString, IsOptional, IsBoolean, IsObject, IsNumber } from 'class-validator';

export class CreateIntegrationDto {
  @IsNumber()
  subAccountId: number;

  @IsNumber()
  integrationTemplateId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;
} 