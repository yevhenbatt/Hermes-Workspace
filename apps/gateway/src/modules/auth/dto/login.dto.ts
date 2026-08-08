import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'alex' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'Use a strong password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
