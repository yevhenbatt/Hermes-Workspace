import { Module } from '@nestjs/common';
import { SwarmClawModule } from '../swarmclaw/swarmclaw.module';

import { ProviderConnectionsController } from './provider-connections.controller';
import { ProviderConnectionsService } from './provider-connections.service';

@Module({
  imports: [SwarmClawModule],
  controllers: [ProviderConnectionsController],
  providers: [ProviderConnectionsService],
  exports: [ProviderConnectionsService],
})
export class ProviderConnectionsModule {}
