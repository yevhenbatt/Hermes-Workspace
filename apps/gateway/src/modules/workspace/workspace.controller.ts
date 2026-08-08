import { Body, Controller, Get, Param, Post, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace Core')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('organizations')
  @Version('1')
  @ApiOperation({ summary: 'List organizations available to the current user' })
  @ApiOkResponse({ description: 'Organizations with the caller role.' })
  listOrganizations(@Req() req: any) { return this.workspaceService.listOrganizations(req.user.userId); }

  @Post('organizations')
  @Version('1')
  @ApiOperation({ summary: 'Create an organization owned by the current user' })
  @ApiCreatedResponse({ description: 'Organization created; caller is its owner.' })
  createOrganization(@Req() req: any, @Body() dto: CreateOrganizationDto) { return this.workspaceService.createOrganization(req.user.userId, dto); }

  @Get('organizations/:organizationId/workspaces')
  @Version('1')
  @ApiOperation({ summary: 'List organization workspaces' })
  listWorkspaces(@Req() req: any, @Param('organizationId') organizationId: string) { return this.workspaceService.listWorkspaces(req.user.userId, organizationId); }

  @Post('organizations/:organizationId/workspaces')
  @Version('1')
  @ApiOperation({ summary: 'Create a workspace in an organization' })
  createWorkspace(@Req() req: any, @Param('organizationId') organizationId: string, @Body() dto: CreateWorkspaceDto) { return this.workspaceService.createWorkspace(req.user.userId, organizationId, dto); }

  @Get('workspaces/:workspaceId/projects')
  @Version('1')
  @ApiOperation({ summary: 'List projects in a workspace' })
  listProjects(@Req() req: any, @Param('workspaceId') workspaceId: string) { return this.workspaceService.listProjects(req.user.userId, workspaceId); }

  @Post('workspaces/:workspaceId/projects')
  @Version('1')
  @ApiOperation({ summary: 'Create a project in a workspace' })
  createProject(@Req() req: any, @Param('workspaceId') workspaceId: string, @Body() dto: CreateProjectDto) { return this.workspaceService.createProject(req.user.userId, workspaceId, dto); }
}
