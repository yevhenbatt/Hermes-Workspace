import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import type { OrganizationMemberRole } from './add-organization-member.dto';

export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({ enum: ['admin', 'editor', 'viewer'] })
  @IsIn(['admin', 'editor', 'viewer'])
  role!: OrganizationMemberRole;
}
