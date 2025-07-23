import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class UpdateWebsiteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  structure?: Record<string, any>;

  @IsOptional()
  @IsString()
  storageProvider?: string; // 'database', 'r2', 'hybrid'

  @IsOptional()
  @IsNumber()
  totalFileSize?: number;

  @IsOptional()
  @IsNumber()
  fileCount?: number;

  @IsOptional()
  @IsString()
  status?: string; // 'active', 'archived', 'draft'
} 