import { Controller, Get, Version } from '@nestjs/common';

import { SystemService } from './system.service';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

@ApiOperation({
  summary: 'System information',
  description: 'Returns information about the running Hermes Workspace Gateway instance.',
})
@ApiResponse({
  status: 200,
  description: 'System information returned successfully.',
})

  @Version('1')
  @Get()
  getSystemInfo() {
    return this.systemService.getInfo();
  }
}
