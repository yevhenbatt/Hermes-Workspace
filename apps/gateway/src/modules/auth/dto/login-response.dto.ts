import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token',
    example: 'b0d4d4e6-4d4f-43af-a7d2-2b39f4d2f0b8',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 3600,
  })
  expiresIn!: number;
}
