import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppConfigModule } from '../../config/config.module';
import { AppConfigService } from '../../config/app-config.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from '../../common/security/security.module';

@Module({
  imports: [
    AppConfigModule,
    UsersModule,
    SecurityModule,

    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtAccessTokenExpiresIn,
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy,],

  exports: [JwtModule],
})

export class AuthModule {}
