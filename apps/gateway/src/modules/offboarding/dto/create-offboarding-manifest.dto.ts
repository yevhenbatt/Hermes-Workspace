import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

export const offboardingActions = ['delete', 'archive', 'transfer', 'export'] as const;
export const offboardingResourceTypes = ['personal_vault_note', 'personal_draft', 'personal_chat', 'personal_file'] as const;
export const offboardingDestinationTypes = ['none', 'hermes_archive', 'gateway_user', 'organization', 'departing_user'] as const;

export type OffboardingAction = (typeof offboardingActions)[number];
export type OffboardingResourceType = (typeof offboardingResourceTypes)[number];
export type OffboardingDestinationType = (typeof offboardingDestinationTypes)[number];

export class OffboardingManifestItemDto {
  @ApiProperty({ enum: offboardingResourceTypes })
  @IsIn(offboardingResourceTypes)
  resourceType!: OffboardingResourceType;

  @ApiProperty({ example: 'vault-note-identifier-or-path' })
  @IsString() @MinLength(1) @MaxLength(255)
  resourceId!: string;

  @ApiProperty({ enum: offboardingActions })
  @IsIn(offboardingActions)
  action!: OffboardingAction;

  @ApiProperty({ enum: offboardingDestinationTypes })
  @IsIn(offboardingDestinationTypes)
  destinationType!: OffboardingDestinationType;

  @ApiProperty({ required: false, description: 'Required only for transfer to an existing Gateway user or organization.' })
  @IsOptional() @IsUUID()
  destinationId?: string;
}

export class CreateOffboardingManifestDto {
  @ApiProperty({ example: true, description: 'Must be true: the caller explicitly confirms the selected actions.' })
  @IsBoolean()
  consentConfirmed!: boolean;

  @ApiProperty({ type: [OffboardingManifestItemDto], minItems: 1 })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OffboardingManifestItemDto)
  items!: OffboardingManifestItemDto[];
}
