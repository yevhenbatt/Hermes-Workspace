import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentService } from './agent.service';

@ApiTags('Hermes Agent')
@Controller('agent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('health')
  @Version('1')
  @ApiOperation({
    summary: 'Hermes Agent health',
    description: 'Returns a minimal readiness status for the private Hermes Agent service.',
  })
  @ApiOkResponse({ description: 'Hermes Agent is reachable.' })
  @ApiServiceUnavailableResponse({ description: 'Hermes Agent is unavailable.' })
  getHealth() {
    return this.agentService.getHealth();
  }
}
