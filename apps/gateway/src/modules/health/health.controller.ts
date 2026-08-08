import { Controller, Get, Version } from '@nestjs/common';
import { HealthService } from './health.service';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
@ApiOperation({
  summary: 'Health check',
  description: 'Returns the current health status of the Workspace Gateway.',
})
@ApiResponse({
  status: 200,
  description: 'Gateway is healthy.',
})

  @Version('1')
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }
}
