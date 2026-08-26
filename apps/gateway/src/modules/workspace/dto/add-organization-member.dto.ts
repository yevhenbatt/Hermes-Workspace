import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class AddOrganizationMemberDto {
  @ApiProperty({ example: 'alex' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.-]{2,63}$/)
  username!: string;

  @ApiPropertyOptional({ enum: ['admin', 'editor', 'viewer'], default: 'editor' })
  @IsOptional()
  @IsIn(['admin', 'editor', 'viewer'])
  role: OrganizationMemberRole = 'editor';
}

export type OrganizationMemberRole = 'admin' | 'editor' | 'viewer';
