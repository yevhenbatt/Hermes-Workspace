import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from './common/logger/logger.module';
import { ApplicationModule } from './common/application/application.module';
import { AppConfigModule } from './config/config.module';
import configuration from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { SystemModule } from './modules/system/system.module';
import { UsersModule } from './modules/users/users.module';

const databaseEnabled = process.env.DATABASE_ENABLED === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule,
    AppConfigModule,
    ApplicationModule,
    ...(databaseEnabled ? [DatabaseModule] : []),
    HealthModule,
    SystemModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
