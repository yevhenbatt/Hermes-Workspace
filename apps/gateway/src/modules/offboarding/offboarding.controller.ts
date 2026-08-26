import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CancelOffboardingManifestDto } from './dto/cancel-offboarding-manifest.dto';
import { CreateOffboardingManifestDto } from './dto/create-offboarding-manifest.dto';
import { ReviewOffboardingManifestDto } from './dto/review-offboarding-manifest.dto';
import { OffboardingService } from './offboarding.service';

@ApiTags('Offboarding')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly offboardingService: OffboardingService) {}

  @Post('manifests')
  @Version('1')
  @ApiOperation({ summary: 'Submit a consented preservation manifest for personal resources' })
  @ApiCreatedResponse({ description: 'Records intent only; it does not delete, export, archive or transfer data.' })
  createManifest(@Req() req: any, @Body() dto: CreateOffboardingManifestDto) {
    return this.offboardingService.createManifest(req.user.userId, dto);
  }

  @Get('manifests/mine')
  @Version('1')
  @ApiOperation({ summary: 'List the current user\'s offboarding manifests and decisions' })
  @ApiOkResponse({ description: 'Personal manifest records only.' })
  listMine(@Req() req: any) {
    return this.offboardingService.listOwnManifests(req.user.userId);
  }

  @Post('manifests/:manifestId/cancel')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw an unreviewed offboarding manifest' })
  cancelManifest(@Req() req: any, @Param('manifestId') manifestId: string, @Body() dto: CancelOffboardingManifestDto) {
    return this.offboardingService.cancelManifest(req.user.userId, manifestId, dto);
  }

  @Get('admin/manifests')
  @Version('1')
  @ApiOperation({ summary: 'List offboarding manifests (platform administrator only)' })
  listForReview(@Req() req: any, @Query('status') status?: string) {
    return this.offboardingService.listForReview(req.user.userId, status);
  }

  @Post('admin/manifests/:manifestId/review')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a submitted manifest (platform administrator only)' })
  @ApiOkResponse({ description: 'Approval authorizes a future scoped executor; it does not itself perform resource actions.' })
  reviewManifest(@Req() req: any, @Param('manifestId') manifestId: string, @Body() dto: ReviewOffboardingManifestDto) {
    return this.offboardingService.reviewManifest(req.user.userId, manifestId, dto);
  }
}
