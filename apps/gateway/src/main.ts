import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);

  app.setGlobalPrefix('api/v1');

  await app.listen(config.port);

  console.log(`🚀 Workspace Gateway started on port ${config.port}`);
}

bootstrap();
