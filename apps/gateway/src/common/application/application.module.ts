import { Global, Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/config.module';
import { ApplicationService } from './application.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
