import { IsOptional, IsUUID } from 'class-validator';

export class ListAgentTasksDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
