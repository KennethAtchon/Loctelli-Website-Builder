import { IsString, IsOptional, IsInt, IsEmail, IsJSON, IsNumber } from 'class-validator';

export class CreateLeadDto {
  @IsInt()
  userId: number;

  @IsInt()
  strategyId: number;

  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  customId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsJSON()
  @IsOptional()
  messages?: any;

  @IsString()
  @IsOptional()
  lastMessage?: string;

  @IsString()
  @IsOptional()
  lastMessageDate?: string;

  @IsNumber()
  @IsOptional()
  subAccountId?: number;
}
