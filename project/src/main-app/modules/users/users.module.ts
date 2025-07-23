import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { GhlModule } from '../../integrations/ghl-integrations/ghl/ghl.module';

@Module({
  imports: [PrismaModule, GhlModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
