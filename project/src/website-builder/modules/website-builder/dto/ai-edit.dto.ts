import { IsString, IsOptional, IsObject } from 'class-validator';

export class AiEditDto {
  @IsString()
  prompt: string; // Natural language instruction

  @IsOptional()
  @IsString()
  targetFile?: string; // Specific file to edit (optional)

  @IsOptional()
  @IsObject()
  context?: Record<string, any>; // Additional context for AI
} 