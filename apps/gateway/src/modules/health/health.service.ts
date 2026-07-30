import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: AppConfigService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: this.config.name,
      version: this.config.version,
      environment: this.config.environment,
    };
  }
}
