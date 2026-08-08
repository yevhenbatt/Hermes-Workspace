import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Hermes MVP' })
  @IsString() @MinLength(2) @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'hermes-mvp', description: 'Generated from name when omitted.' })
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'First customer-facing Hermes workspace.' })
  @IsOptional() @IsString() @MaxLength(10_000)
  description?: string;
}
