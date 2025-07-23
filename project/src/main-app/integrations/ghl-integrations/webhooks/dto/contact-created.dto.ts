import { IsString, IsOptional } from 'class-validator';

export class ContactCreatedDto {
  @IsString()
  id: string;

  @IsString()
  locationId: string; // GHL Subaccount/Location ID

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
