import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CancelOffboardingManifestDto {
  @ApiProperty({ example: true, description: 'Explicit confirmation that the caller withdraws this unreviewed manifest.' })
  @IsBoolean()
  confirmed!: boolean;
}
