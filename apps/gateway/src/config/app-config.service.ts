import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get name(): string {
    return this.config.get<string>('app.name')!;
  }

  get version(): string {
    return this.config.get<string>('app.version')!;
  }

  get environment(): string {
    return this.config.get<string>('app.environment')!;
  }

  get port(): number {
    return this.config.get<number>('app.port')!;
  }
}
