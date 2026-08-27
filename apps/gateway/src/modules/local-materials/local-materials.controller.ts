import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLocalMaterialSourceDto } from './dto/create-local-material-source.dto';
import { LocalMaterialsService } from './local-materials.service';

@ApiTags('Local Materials')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('local-materials/sources')
export class LocalMaterialsController {
  constructor(private readonly localMaterialsService: LocalMaterialsService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List the authenticated user\'s registered local material sources' })
  @ApiOkResponse({ description: 'Returns metadata only; never local paths or file contents.' })
  listSources(@Req() req: any) {
    return this.localMaterialsService.listSources(req.user.userId);
  }

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Register a user-approved local material source by metadata only' })
  @ApiCreatedResponse({ description: 'Stores no local path, content, token or uploaded file.' })
  createSource(@Req() req: any, @Body() dto: CreateLocalMaterialSourceDto) {
    return this.localMaterialsService.createSource(req.user.userId, dto);
  }

  @Delete(':sourceId')
  @Version('1')
  @ApiOperation({ summary: 'Revoke a registered local material source without touching local data' })
  @ApiOkResponse({ description: 'Deletes Gateway metadata only; the local source remains on the user computer.' })
  revokeSource(@Req() req: any, @Param('sourceId') sourceId: string) {
    return this.localMaterialsService.revokeSource(req.user.userId, sourceId);
  }
}
