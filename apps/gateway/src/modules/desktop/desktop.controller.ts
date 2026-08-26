import { Body, Controller, Get, Put, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelectDesktopContextDto } from './dto/select-desktop-context.dto';
import { DesktopService } from './desktop.service';

@ApiTags('Desktop Bootstrap')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('desktop')
export class DesktopController {
  constructor(private readonly desktopService: DesktopService) {}

  @Get('bootstrap')
  @Version('1')
  @ApiOperation({ summary: 'Resolve the authenticated user and their permitted Workspace tree for a Desktop client' })
  @ApiOkResponse({ description: 'Gateway-derived user, organizations, workspaces, projects and selected context.' })
  bootstrap(@Req() req: any) {
    return this.desktopService.bootstrap(req.user.userId);
  }

  @Put('context')
  @Version('1')
  @ApiOperation({ summary: 'Persist an authenticated user\'s selected organization, Workspace and optional project context' })
  @ApiOkResponse({ description: 'The saved context is validated against current Gateway permissions.' })
  selectContext(@Req() req: any, @Body() dto: SelectDesktopContextDto) {
    return this.desktopService.selectContext(req.user.userId, dto);
  }
}
