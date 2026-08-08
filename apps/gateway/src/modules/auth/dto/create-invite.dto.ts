import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @ApiPropertyOptional({ example: 'new-user' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.-]{2,63}$/)
  username?: string;

  @ApiPropertyOptional({ example: 168, default: 168 })
  @IsOptional()
  @Min(1)
  @Max(720)
  expiresInHours = 168;
}
