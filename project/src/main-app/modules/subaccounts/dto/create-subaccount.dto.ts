import { IsString, IsOptional, IsObject, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSubAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
} 