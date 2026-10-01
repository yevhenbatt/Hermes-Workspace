import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { ProviderConnectionsModule } from '../provider-connections/provider-connections.module';
import { SwarmClawModule } from '../swarmclaw/swarmclaw.module';
import { AgentTasksController } from './agent-tasks.controller';
import { AgentTasksService } from './agent-tasks.service';

@Module({
  imports: [AgentModule, ProviderConnectionsModule, SwarmClawModule],
  controllers: [AgentTasksController],
  providers: [AgentTasksService],
})
export class AgentTasksModule {}
