import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer';

@Injectable()
export class WorkspaceService {
  constructor(private readonly orm: MikroORM) {}

  async listOrganizations(userId: string) {
    return this.query(
      `select o.id, o.name, o.slug, om.role, o.created_at as "createdAt", o.updated_at as "updatedAt"
       from workspace.organizations o
       join workspace.organization_members om on om.organization_id = o.id
       where om.user_id = ?
       order by o.created_at asc`,
      [userId],
    );
  }

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const id = randomUUID();
    const slug = dto.slug ?? this.slugify(dto.name);
    const connection = this.orm.em.getConnection();
    const existing = await connection.execute(
      'select id from workspace.organizations where slug = ?',
      [slug],
    ) as any[];
    if (existing.length) throw new ConflictException('Organization slug is already in use');

    await connection.execute(
      'insert into workspace.organizations (id, name, slug, created_by_user_id) values (?, ?, ?, ?)',
      [id, dto.name, slug, userId],
    );
    await connection.execute(
      'insert into workspace.organization_members (organization_id, user_id, role) values (?, ?, ?)',
      [id, userId, 'owner'],
    );
    return { id, name: dto.name, slug, role: 'owner' as const };
  }

  async listWorkspaces(userId: string, organizationId: string) {
    await this.requireOrganizationAccess(userId, organizationId);
    return this.query(
      `select id, organization_id as "organizationId", name, slug,
              created_at as "createdAt", updated_at as "updatedAt"
       from workspace.workspaces where organization_id = ? order by created_at asc`,
      [organizationId],
    );
  }

  async createWorkspace(userId: string, organizationId: string, dto: CreateWorkspaceDto) {
    await this.requireOrganizationWrite(userId, organizationId);
    const id = randomUUID();
    const slug = dto.slug ?? this.slugify(dto.name);
    const connection = this.orm.em.getConnection();
    const existing = await connection.execute(
      'select id from workspace.workspaces where organization_id = ? and slug = ?',
      [organizationId, slug],
    ) as any[];
    if (existing.length) throw new ConflictException('Workspace slug is already in use in this organization');
    await connection.execute(
      'insert into workspace.workspaces (id, organization_id, name, slug) values (?, ?, ?, ?)',
      [id, organizationId, dto.name, slug],
    );
    return { id, organizationId, name: dto.name, slug };
  }

  async listProjects(userId: string, workspaceId: string) {
    await this.requireWorkspaceAccess(userId, workspaceId);
    return this.query(
      `select id, workspace_id as "workspaceId", name, slug, description,
              created_by_user_id as "createdByUserId", created_at as "createdAt", updated_at as "updatedAt"
       from workspace.projects where workspace_id = ? order by created_at asc`,
      [workspaceId],
    );
  }

  async createProject(userId: string, workspaceId: string, dto: CreateProjectDto) {
    await this.requireWorkspaceWrite(userId, workspaceId);
    const id = randomUUID();
    const slug = dto.slug ?? this.slugify(dto.name);
    const connection = this.orm.em.getConnection();
    const existing = await connection.execute(
      'select id from workspace.projects where workspace_id = ? and slug = ?',
      [workspaceId, slug],
    ) as any[];
    if (existing.length) throw new ConflictException('Project slug is already in use in this workspace');
    await connection.execute(
      'insert into workspace.projects (id, workspace_id, name, slug, description, created_by_user_id) values (?, ?, ?, ?, ?, ?)',
      [id, workspaceId, dto.name, slug, dto.description ?? null, userId],
    );
    return { id, workspaceId, name: dto.name, slug, description: dto.description ?? null, createdByUserId: userId };
  }

  private async requireOrganizationAccess(userId: string, organizationId: string): Promise<OrganizationRole> {
    const rows = await this.query(
      'select role from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, userId],
    ) as Array<{ role: OrganizationRole }>;
    if (!rows.length) throw new NotFoundException('Organization was not found');
    return rows[0].role;
  }

  private async requireOrganizationWrite(userId: string, organizationId: string) {
    const role = await this.requireOrganizationAccess(userId, organizationId);
    if (role !== 'owner' && role !== 'admin') throw new ForbiddenException('Organization administrator access is required');
  }

  private async requireWorkspaceAccess(userId: string, workspaceId: string): Promise<OrganizationRole> {
    const rows = await this.query(
      `select om.role from workspace.workspaces w
       join workspace.organization_members om on om.organization_id = w.organization_id
       where w.id = ? and om.user_id = ?`,
      [workspaceId, userId],
    ) as Array<{ role: OrganizationRole }>;
    if (!rows.length) throw new NotFoundException('Workspace was not found');
    return rows[0].role;
  }

  private async requireWorkspaceWrite(userId: string, workspaceId: string) {
    const role = await this.requireWorkspaceAccess(userId, workspaceId);
    if (role === 'viewer') throw new ForbiddenException('Workspace write access is required');
  }

  private async query(sql: string, params: unknown[]) {
    return this.orm.em.getConnection().execute(sql, params) as Promise<any[]>;
  }

  private slugify(value: string) {
    const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug) throw new ConflictException('Name must contain Latin letters or numbers to generate a slug');
    return slug.slice(0, 80);
  }
}
