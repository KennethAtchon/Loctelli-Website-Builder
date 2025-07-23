import { IsString, IsOptional, IsInt, IsEmail, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string = 'user';

  @IsString()
  @IsOptional()
  budget?: string;

  @IsOptional()
  bookingsTime?: any;

  @IsInt()
  @IsOptional()
  bookingEnabled?: number = 1;

  @IsString()
  @IsOptional()
  calendarId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @IsNumber()
  @IsOptional()
  subAccountId?: number;
}
