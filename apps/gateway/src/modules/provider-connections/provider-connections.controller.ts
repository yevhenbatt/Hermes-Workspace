import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import { CreateProviderConnectionDto } from './dto/create-provider-connection.dto';
import { CreateProviderConnectionGrantDto } from './dto/create-provider-connection-grant.dto';
import { ProviderConnectionsService } from './provider-connections.service';

interface AuthenticatedRequest {
  user: { userId: string };
}

@ApiTags('Provider Connections')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('provider-connections')
export class ProviderConnectionsController {
  constructor(
    private readonly providerConnectionsService: ProviderConnectionsService,
  ) {}

  @Get()
  @Version('1')
  @ApiOperation({
    summary: 'List personal and explicitly shared provider connections',
  })
  @ApiOkResponse({
    description:
      'OAuth metadata only; credentials and tokens are never returned.',
  })
  listConnections(@Req() req: AuthenticatedRequest) {
    return this.providerConnectionsService.listConnections(req.user.userId);
  }

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a pending personal provider connection' })
  @ApiCreatedResponse({
    description:
      'Connection metadata created; OAuth is completed by a private adapter later.',
  })
  createConnection(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProviderConnectionDto,
  ) {
    return this.providerConnectionsService.createConnection(
      req.user.userId,
      dto,
    );
  }

  @Post(':connectionId/grants')
  @Version('1')
  @ApiOperation({
    summary:
      'Share a connection with an active user in one organization or workspace',
  })
  createGrant(
    @Req() req: AuthenticatedRequest,
    @Param('connectionId') connectionId: string,
    @Body() dto: CreateProviderConnectionGrantDto,
  ) {
    return this.providerConnectionsService.createGrant(
      req.user.userId,
      connectionId,
      dto,
    );
  }

  @Delete(':connectionId/grants/:grantId')
  @Version('1')
  @ApiOperation({ summary: 'Revoke a previously granted connection share' })
  revokeGrant(
    @Req() req: AuthenticatedRequest,
    @Param('connectionId') connectionId: string,
    @Param('grantId') grantId: string,
  ) {
    return this.providerConnectionsService.revokeGrant(
      req.user.userId,
      connectionId,
      grantId,
    );
  }

  @Delete(':connectionId')
  @Version('1')
  @ApiOperation({
    summary: 'Revoke the owner connection and all of its shares',
  })
  revokeConnection(
    @Req() req: AuthenticatedRequest,
    @Param('connectionId') connectionId: string,
  ) {
    return this.providerConnectionsService.revokeConnection(
      req.user.userId,
      connectionId,
    );
  }
}
