import { PartialType } from '@nestjs/mapped-types';
import { CreateIntegrationTemplateDto } from './create-integration-template.dto';

export class UpdateIntegrationTemplateDto extends PartialType(CreateIntegrationTemplateDto) {} 