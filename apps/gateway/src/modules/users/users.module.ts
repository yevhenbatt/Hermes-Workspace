import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { UsersController } from './users.controller';
import { User } from './models/user.model';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

const databaseEnabled = process.env.DATABASE_ENABLED === 'true';

@Module({
  imports: databaseEnabled ? [MikroOrmModule.forFeature([User])] : [],
  controllers: [UsersController],
  providers: [UserRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
