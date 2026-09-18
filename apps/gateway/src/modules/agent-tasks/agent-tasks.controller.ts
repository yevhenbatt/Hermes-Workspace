import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAgentTaskDto } from './dto/create-agent-task.dto';
import { ListAgentTasksDto } from './dto/list-agent-tasks.dto';
import { AgentTasksService } from './agent-tasks.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@ApiTags('Hermes Agent Tasks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('agent/tasks')
export class AgentTasksController {
  constructor(private readonly agentTasksService: AgentTasksService) {}

  @Post()
  @Version('1')
  @ApiOperation({
    summary: 'Start a Hermes Agent task in an authorized workspace context',
  })
  @ApiCreatedResponse({
    description: 'Task accepted by the private Hermes Agent executor.',
  })
  createTask(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAgentTaskDto,
  ) {
    return this.agentTasksService.createTask(req.user.userId, dto);
  }

  @Get()
  @Version('1')
  @ApiOperation({
    summary: 'List Agent tasks available in a workspace context',
  })
  @ApiOkResponse({ description: 'Persistent Gateway task records.' })
  listTasks(@Req() req: AuthenticatedRequest, @Query() dto: ListAgentTasksDto) {
    return this.agentTasksService.listTasks(req.user.userId, dto);
  }

  @Get(':taskId')
  @Version('1')
  @ApiOperation({
    summary:
      'Get an Agent task and refresh its current executor status when available',
  })
  getTask(@Req() req: AuthenticatedRequest, @Param('taskId') taskId: string) {
    return this.agentTasksService.getTask(req.user.userId, taskId);
  }

  @Post(':taskId/stop')
  @Version('1')
  @ApiOperation({
    summary:
      'Request a stop for an Agent task created by the caller or managed by the caller',
  })
  stopTask(@Req() req: AuthenticatedRequest, @Param('taskId') taskId: string) {
    return this.agentTasksService.stopTask(req.user.userId, taskId);
  }
}
