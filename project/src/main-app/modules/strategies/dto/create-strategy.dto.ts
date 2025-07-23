import { IsString, IsOptional, IsInt, IsJSON, IsNumber } from 'class-validator';

export class CreateStrategyDto {
  @IsInt()
  userId: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  tone?: string;

  @IsString()
  @IsOptional()
  aiInstructions?: string;

  @IsString()
  @IsOptional()
  objectionHandling?: string;

  @IsString()
  @IsOptional()
  qualificationPriority?: string;

  @IsInt()
  @IsOptional()
  creativity?: number;

  @IsString()
  @IsOptional()
  aiObjective?: string;

  @IsString()
  @IsOptional()
  disqualificationCriteria?: string;

  @IsJSON()
  @IsOptional()
  exampleConversation?: any;

  @IsInt()
  @IsOptional()
  delayMin?: number;

  @IsInt()
  @IsOptional()
  delayMax?: number;

  @IsInt()
  @IsOptional()
  promptTemplateId?: number;

  @IsNumber()
  @IsOptional()
  subAccountId?: number;
}
