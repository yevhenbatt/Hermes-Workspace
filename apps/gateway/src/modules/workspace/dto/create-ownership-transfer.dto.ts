import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateOwnershipTransferDto {
  @ApiProperty({ format: 'uuid', description: 'Existing organization member who will become owner after accepting.' })
  @IsUUID()
  toUserId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required only when a platform administrator transfers ownership on behalf of an owner.' })
  @IsOptional()
  @IsUUID()
  fromOwnerUserId?: string;

  @ApiPropertyOptional({ enum: ['admin', 'viewer'], default: 'admin', description: 'Role of the former owner after acceptance.' })
  @IsOptional()
  @IsIn(['admin', 'viewer'])
  formerOwnerRole: 'admin' | 'viewer' = 'admin';

  @ApiPropertyOptional({ example: 168, default: 168 })
  @IsOptional()
  @Min(1)
  @Max(720)
  expiresInHours = 168;
}
