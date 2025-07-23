import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class CreatePromptTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  bookingInstruction?: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  creativity?: number;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokens?: number;
} 