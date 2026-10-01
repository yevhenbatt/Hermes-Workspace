import { Module } from '@nestjs/common';

import { SwarmClawService } from './swarmclaw.service';

@Module({
  providers: [SwarmClawService],
  exports: [SwarmClawService],
})
export class SwarmClawModule {}
