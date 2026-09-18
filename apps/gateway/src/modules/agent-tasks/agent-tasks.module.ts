import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { AgentTasksController } from './agent-tasks.controller';
import { AgentTasksService } from './agent-tasks.service';

@Module({
  imports: [AgentModule],
  controllers: [AgentTasksController],
  providers: [AgentTasksService],
})
export class AgentTasksModule {}
