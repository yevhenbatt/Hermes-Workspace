import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_.-]*$/, {
    message: 'username may contain lowercase letters, numbers, dots, underscores, and hyphens only',
  })
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 'Use a long, unique password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
