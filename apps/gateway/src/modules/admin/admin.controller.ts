import { Body, Controller, Get, Param, Patch, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminService } from './admin.service';

@ApiTags('Platform Administration')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List Gateway users (platform administrator only)' })
  @ApiOkResponse({ description: 'User list without password hashes or tokens.' })
  listUsers(@Req() req: any) {
    return this.adminService.listUsers(req.user.userId);
  }

  @Patch(':userId/status')
  @Version('1')
  @ApiOperation({ summary: 'Activate or deactivate a user (platform administrator only)' })
  @ApiOkResponse({ description: 'Deactivation blocks login and protected API use; it does not delete data.' })
  updateUserStatus(@Req() req: any, @Param('userId') userId: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(req.user.userId, userId, dto);
  }
}
