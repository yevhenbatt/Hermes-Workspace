import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateAgentTaskDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  @Length(1, 12_000)
  input!: string;
}
