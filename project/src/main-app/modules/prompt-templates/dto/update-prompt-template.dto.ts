import { PartialType } from '@nestjs/mapped-types';
import { CreatePromptTemplateDto } from './create-prompt-template.dto';

export class UpdatePromptTemplateDto extends PartialType(CreatePromptTemplateDto) {} 