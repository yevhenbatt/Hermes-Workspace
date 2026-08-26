import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'false blocks login and invalidates existing JWT use on the next request.' })
  @IsBoolean()
  isActive!: boolean;
}
