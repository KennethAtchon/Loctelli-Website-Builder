import { IsString, IsOptional, IsInt, IsJSON, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  userId: number;

  @IsInt()
  @IsOptional()
  leadId?: number;

  @IsString()
  bookingType: string;

  @IsJSON()
  details: any;

  @IsString()
  @IsOptional()
  status?: string = 'pending';

  @IsNumber()
  @IsOptional()
  subAccountId?: number;
}
