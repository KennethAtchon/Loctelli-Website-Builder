import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  customId: string;  // This corresponds to contactId in the webhook
}
