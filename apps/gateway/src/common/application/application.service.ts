import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class ApplicationService {
  private readonly startedAt = new Date();

  constructor(private readonly config: AppConfigService) {}

  getInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      environment: this.config.environment,
      uptime: process.uptime(),
      nodeVersion: process.version,
      startedAt: this.startedAt.toISOString(),
    };
  }

  getHealthInfo() {
  return {
    service: this.config.name,
    version: this.config.version,
    environment: this.config.environment,
  };
 }
}
