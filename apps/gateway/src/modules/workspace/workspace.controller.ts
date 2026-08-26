import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOwnershipTransferDto } from './dto/create-ownership-transfer.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
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

  @Patch('organizations/:organizationId')
  @Version('1')
  @ApiOperation({ summary: 'Edit an organization (owner or admin)' })
  updateOrganization(@Req() req: any, @Param('organizationId') organizationId: string, @Body() dto: UpdateOrganizationDto) { return this.workspaceService.updateOrganization(req.user.userId, organizationId, dto); }

  @Delete('organizations/:organizationId')
  @Version('1')
  @ApiOperation({ summary: 'Delete an organization and all its workspaces and projects (owner only)' })
  deleteOrganization(@Req() req: any, @Param('organizationId') organizationId: string) { return this.workspaceService.deleteOrganization(req.user.userId, organizationId); }

  @Get('organizations/:organizationId/members')
  @Version('1')
  @ApiOperation({ summary: 'List organization members' })
  listMembers(@Req() req: any, @Param('organizationId') organizationId: string) { return this.workspaceService.listMembers(req.user.userId, organizationId); }

  @Post('organizations/:organizationId/members')
  @Version('1')
  @ApiOperation({ summary: 'Add an existing registered user to an organization (owner or admin)' })
  addMember(@Req() req: any, @Param('organizationId') organizationId: string, @Body() dto: AddOrganizationMemberDto) { return this.workspaceService.addMember(req.user.userId, organizationId, dto); }

  @Patch('organizations/:organizationId/members/:memberUserId')
  @Version('1')
  @ApiOperation({ summary: 'Change a non-owner member role' })
  updateMemberRole(@Req() req: any, @Param('organizationId') organizationId: string, @Param('memberUserId') memberUserId: string, @Body() dto: UpdateOrganizationMemberRoleDto) { return this.workspaceService.updateMemberRole(req.user.userId, organizationId, memberUserId, dto); }

  @Delete('organizations/:organizationId/members/:memberUserId')
  @Version('1')
  @ApiOperation({ summary: 'Remove a non-owner organization member' })
  removeMember(@Req() req: any, @Param('organizationId') organizationId: string, @Param('memberUserId') memberUserId: string) { return this.workspaceService.removeMember(req.user.userId, organizationId, memberUserId); }

  @Post('organizations/:organizationId/leave')
  @Version('1')
  @ApiOperation({ summary: 'Leave an organization; an owner must transfer ownership first' })
  leaveOrganization(@Req() req: any, @Param('organizationId') organizationId: string) { return this.workspaceService.leaveOrganization(req.user.userId, organizationId); }

  @Get('organizations/:organizationId/ownership-transfers')
  @Version('1')
  @ApiOperation({ summary: 'List organization ownership transfers (owner or admin)' })
  listOwnershipTransfers(@Req() req: any, @Param('organizationId') organizationId: string) { return this.workspaceService.listOwnershipTransfers(req.user.userId, organizationId); }

  @Post('organizations/:organizationId/ownership-transfers')
  @Version('1')
  @ApiOperation({ summary: 'Request transfer of an owner role to an existing member' })
  createOwnershipTransfer(@Req() req: any, @Param('organizationId') organizationId: string, @Body() dto: CreateOwnershipTransferDto) { return this.workspaceService.createOwnershipTransfer(req.user.userId, organizationId, dto); }

  @Post('organizations/:organizationId/ownership-transfers/:transferId/accept')
  @Version('1')
  @ApiOperation({ summary: 'Accept an ownership transfer addressed to the current user' })
  acceptOwnershipTransfer(@Req() req: any, @Param('organizationId') organizationId: string, @Param('transferId') transferId: string) { return this.workspaceService.acceptOwnershipTransfer(req.user.userId, organizationId, transferId); }

  @Post('organizations/:organizationId/ownership-transfers/:transferId/cancel')
  @Version('1')
  @ApiOperation({ summary: 'Cancel a pending ownership transfer (owner only)' })
  cancelOwnershipTransfer(@Req() req: any, @Param('organizationId') organizationId: string, @Param('transferId') transferId: string) { return this.workspaceService.cancelOwnershipTransfer(req.user.userId, organizationId, transferId); }

  @Get('workspaces/:workspaceId/projects')
  @Version('1')
  @ApiOperation({ summary: 'List projects in a workspace' })
  listProjects(@Req() req: any, @Param('workspaceId') workspaceId: string) { return this.workspaceService.listProjects(req.user.userId, workspaceId); }

  @Post('workspaces/:workspaceId/projects')
  @Version('1')
  @ApiOperation({ summary: 'Create a project in a workspace' })
  createProject(@Req() req: any, @Param('workspaceId') workspaceId: string, @Body() dto: CreateProjectDto) { return this.workspaceService.createProject(req.user.userId, workspaceId, dto); }

  @Patch('projects/:projectId')
  @Version('1')
  @ApiOperation({ summary: 'Edit a project (owner, admin or editor)' })
  updateProject(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) { return this.workspaceService.updateProject(req.user.userId, projectId, dto); }

  @Delete('projects/:projectId')
  @Version('1')
  @ApiOperation({ summary: 'Delete a project (owner or admin)' })
  deleteProject(@Req() req: any, @Param('projectId') projectId: string) { return this.workspaceService.deleteProject(req.user.userId, projectId); }

  @Get('organizations/:organizationId/workspaces')
  @Version('1')
  @ApiOperation({ summary: 'List organization workspaces' })
  listWorkspaces(@Req() req: any, @Param('organizationId') organizationId: string) { return this.workspaceService.listWorkspaces(req.user.userId, organizationId); }

  @Post('organizations/:organizationId/workspaces')
  @Version('1')
  @ApiOperation({ summary: 'Create a workspace in an organization' })
  createWorkspace(@Req() req: any, @Param('organizationId') organizationId: string, @Body() dto: CreateWorkspaceDto) { return this.workspaceService.createWorkspace(req.user.userId, organizationId, dto); }

  @Patch('workspaces/:workspaceId')
  @Version('1')
  @ApiOperation({ summary: 'Edit a workspace (owner or admin)' })
  updateWorkspace(@Req() req: any, @Param('workspaceId') workspaceId: string, @Body() dto: UpdateWorkspaceDto) { return this.workspaceService.updateWorkspace(req.user.userId, workspaceId, dto); }

  @Delete('workspaces/:workspaceId')
  @Version('1')
  @ApiOperation({ summary: 'Delete a workspace and all its projects (owner or admin)' })
  deleteWorkspace(@Req() req: any, @Param('workspaceId') workspaceId: string) { return this.workspaceService.deleteWorkspace(req.user.userId, workspaceId); }
}
