import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export const localMaterialSourceTypes = ['obsidian_vault', 'directory', 'file'] as const;
export const localMaterialModes = ['local_only', 'shared_synced', 'selective_attachment'] as const;

export type LocalMaterialSourceType = (typeof localMaterialSourceTypes)[number];
export type LocalMaterialMode = (typeof localMaterialModes)[number];

export class CreateLocalMaterialSourceDto {
  @ApiProperty({ example: 'Research vault on this computer', description: 'Human-friendly label only. Do not send a local path.' })
  @IsString() @MinLength(1) @MaxLength(120)
  displayName!: string;

  @ApiProperty({ enum: localMaterialSourceTypes })
  @IsIn(localMaterialSourceTypes)
  sourceType!: LocalMaterialSourceType;

  @ApiProperty({ enum: localMaterialModes })
  @IsIn(localMaterialModes)
  mode!: LocalMaterialMode;

  @ApiPropertyOptional({ description: 'Required only for shared_synced. Gateway verifies Workspace write access.' })
  @IsOptional() @IsUUID()
  workspaceId?: string;
}
