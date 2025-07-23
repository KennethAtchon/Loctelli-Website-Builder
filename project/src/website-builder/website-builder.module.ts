import { Module } from '@nestjs/common';
import { WebsiteBuilderSubModule } from './modules/website-builder/website-builder.module';

@Module({
  imports: [
    WebsiteBuilderSubModule,
  ],
})
export class WebsiteBuilderModule {} 