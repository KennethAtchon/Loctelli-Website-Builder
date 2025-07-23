import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class CreateWebsiteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type: string; // 'static', 'vite', 'react', 'nextjs'

  @IsObject()
  structure: Record<string, any>; // Parsed HTML/CSS/JS structure

  @IsOptional()
  @IsString()
  storageProvider?: string; // 'database', 'r2', 'hybrid'

  @IsOptional()
  @IsNumber()
  totalFileSize?: number;

  @IsOptional()
  @IsNumber()
  fileCount?: number;
} 