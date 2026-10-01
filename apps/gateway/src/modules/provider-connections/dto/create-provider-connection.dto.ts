import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';

export const providerConnectionProviders = [
  'codex',
  'claude',
  'gemini',
] as const;

export type ProviderConnectionProvider =
  (typeof providerConnectionProviders)[number];

export class CreateProviderConnectionDto {
  @ApiProperty({ enum: providerConnectionProviders, example: 'codex' })
  @IsIn(providerConnectionProviders)
  provider!: ProviderConnectionProvider;

  @ApiProperty({ example: 'Моя подписка ChatGPT' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 120)
  displayName!: string;
}
