import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SelectDesktopContextDto {
  @ApiProperty({ description: 'Organization selected by the authenticated user.' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ description: 'Optional Workspace inside the selected organization.' })
  @IsOptional() @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Optional project inside the selected Workspace.' })
  @IsOptional() @IsUUID()
  projectId?: string;
}
