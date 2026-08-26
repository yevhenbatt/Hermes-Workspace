import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';

import { AddOrganizationMemberDto, OrganizationMemberRole } from './dto/add-organization-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOwnershipTransferDto } from './dto/create-ownership-transfer.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer';

@Injectable()
export class WorkspaceService {
  constructor(private readonly orm: MikroORM) {}

  async listOrganizations(userId: string) {
    if (await this.isPlatformAdmin(userId)) {
      return this.query(
        `select o.id, o.name, o.slug, 'platform_admin' as role, o.created_at as "createdAt", o.updated_at as "updatedAt"
         from workspace.organizations o order by o.created_at asc`,
        [],
      );
    }
    return this.query(
      `select o.id, o.name, o.slug, om.role, o.created_at as "createdAt", o.updated_at as "updatedAt"
       from workspace.organizations o join workspace.organization_members om on om.organization_id = o.id
       where om.user_id = ? order by o.created_at asc`,
      [userId],
    );
  }

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const id = randomUUID();
    const slug = dto.slug ?? this.slugify(dto.name);
    await this.ensureOrganizationSlugAvailable(slug);
    const connection = this.orm.em.getConnection();
    await connection.execute('insert into workspace.organizations (id, name, slug, created_by_user_id) values (?, ?, ?, ?)', [id, dto.name, slug, userId]);
    await connection.execute('insert into workspace.organization_members (organization_id, user_id, role) values (?, ?, ?)', [id, userId, 'owner']);
    await this.recordAudit(id, userId, 'organization.created', 'organization', id, { name: dto.name, slug });
    return { id, name: dto.name, slug, role: 'owner' as const };
  }

  async updateOrganization(userId: string, organizationId: string, dto: UpdateOrganizationDto) {
    await this.requireOrganizationAdmin(userId, organizationId);
    this.requireUpdate(dto);
    if (dto.slug) await this.ensureOrganizationSlugAvailable(dto.slug, organizationId);
    const result = await this.update('workspace.organizations', organizationId, dto, ['name', 'slug']);
    await this.recordAudit(organizationId, userId, 'organization.updated', 'organization', organizationId, result);
    return { id: organizationId, ...result };
  }

  async deleteOrganization(userId: string, organizationId: string) {
    await this.requireOrganizationOwner(userId, organizationId);
    await this.recordAudit(organizationId, userId, 'organization.deleted', 'organization', organizationId, {});
    await this.orm.em.getConnection().execute('delete from workspace.organizations where id = ?', [organizationId]);
    return { id: organizationId, deleted: true };
  }

  async listMembers(userId: string, organizationId: string) {
    await this.requireOrganizationAccess(userId, organizationId);
    return this.query(
      `select u.id, u.username, om.role, om.created_at as "joinedAt"
       from workspace.organization_members om join auth.users u on u.id = om.user_id
       where om.organization_id = ? order by om.created_at asc`,
      [organizationId],
    );
  }

  async addMember(userId: string, organizationId: string, dto: AddOrganizationMemberDto) {
    await this.requireOrganizationAdmin(userId, organizationId);
    const [member] = await this.query(
      'select id, username from auth.users where username = ? and is_active = true',
      [dto.username],
    ) as Array<{ id: string; username: string }>;
    if (!member) throw new NotFoundException('Active user was not found');
    const existing = await this.query(
      'select user_id from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, member.id],
    );
    if (existing.length) throw new ConflictException('User is already an organization member');
    await this.orm.em.getConnection().execute(
      'insert into workspace.organization_members (organization_id, user_id, role) values (?, ?, ?)',
      [organizationId, member.id, dto.role],
    );
    await this.recordAudit(organizationId, userId, 'organization.member_added', 'user', member.id, { username: member.username, role: dto.role });
    return { userId: member.id, username: member.username, role: dto.role };
  }

  async updateMemberRole(userId: string, organizationId: string, memberUserId: string, dto: UpdateOrganizationMemberRoleDto) {
    const actor = await this.requireOrganizationAdmin(userId, organizationId);
    const member = await this.requireMember(organizationId, memberUserId);
    if (member.role === 'owner') throw new ForbiddenException('Use ownership transfer to change an owner role');
    if (!actor.platformAdmin && actor.role === 'admin' && (member.role === 'admin' || dto.role === 'admin')) {
      throw new ForbiddenException('Only an organization owner can manage administrators');
    }
    await this.orm.em.getConnection().execute(
      'update workspace.organization_members set role = ? where organization_id = ? and user_id = ?',
      [dto.role, organizationId, memberUserId],
    );
    await this.recordAudit(organizationId, userId, 'organization.member_role_updated', 'user', memberUserId, { fromRole: member.role, toRole: dto.role });
    return { userId: memberUserId, role: dto.role };
  }

  async removeMember(userId: string, organizationId: string, memberUserId: string) {
    const actor = await this.requireOrganizationAdmin(userId, organizationId);
    const member = await this.requireMember(organizationId, memberUserId);
    if (member.role === 'owner') throw new ForbiddenException('An owner must transfer ownership before leaving or removal');
    if (!actor.platformAdmin && actor.role === 'admin' && member.role === 'admin') {
      throw new ForbiddenException('Only an organization owner can remove an administrator');
    }
    await this.orm.em.getConnection().execute(
      'delete from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, memberUserId],
    );
    await this.recordAudit(organizationId, userId, 'organization.member_removed', 'user', memberUserId, { formerRole: member.role });
    return { userId: memberUserId, removed: true };
  }

  async leaveOrganization(userId: string, organizationId: string) {
    const member = await this.requireMember(organizationId, userId);
    if (member.role === 'owner') throw new ForbiddenException('Transfer ownership before leaving an organization');
    await this.orm.em.getConnection().execute(
      'delete from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, userId],
    );
    await this.recordAudit(organizationId, userId, 'organization.member_left', 'user', userId, { formerRole: member.role });
    return { organizationId, left: true };
  }

  async listOwnershipTransfers(userId: string, organizationId: string) {
    await this.requireOrganizationAdmin(userId, organizationId);
    return this.query(
      `select t.id, t.from_user_id as "fromUserId", source.username as "fromUsername", t.to_user_id as "toUserId",
              target.username as "toUsername", t.former_owner_role as "formerOwnerRole", t.status,
              t.expires_at as "expiresAt", t.accepted_at as "acceptedAt", t.cancelled_at as "cancelledAt", t.created_at as "createdAt"
       from workspace.organization_ownership_transfers t
       join auth.users source on source.id = t.from_user_id
       join auth.users target on target.id = t.to_user_id
       where t.organization_id = ? order by t.created_at desc`,
      [organizationId],
    );
  }

  async createOwnershipTransfer(userId: string, organizationId: string, dto: CreateOwnershipTransferDto) {
    const platformAdmin = await this.isPlatformAdmin(userId);
    const actorMember = await this.getOrganizationRole(userId, organizationId);
    const fromUserId = dto.fromOwnerUserId ?? userId;
    if (!platformAdmin && actorMember !== 'owner') throw new ForbiddenException('Organization owner access is required');
    if (!platformAdmin && fromUserId !== userId) throw new ForbiddenException('An owner may transfer only their own ownership');
    if (platformAdmin && actorMember !== 'owner' && !dto.fromOwnerUserId) {
      throw new BadRequestException('Platform administrator must specify fromOwnerUserId');
    }
    if (fromUserId === dto.toUserId) throw new BadRequestException('Transfer recipient must be a different user');
    const source = await this.requireMember(organizationId, fromUserId);
    if (source.role !== 'owner') throw new BadRequestException('fromOwnerUserId is not an organization owner');
    const target = await this.requireMember(organizationId, dto.toUserId);
    if (target.role === 'owner') throw new ConflictException('Transfer recipient is already an owner');

    const connection = this.orm.em.getConnection();
    await connection.execute(
      "update workspace.organization_ownership_transfers set status = 'expired' where organization_id = ? and status = 'pending' and expires_at <= current_timestamp",
      [organizationId],
    );
    const pending = await connection.execute(
      "select id from workspace.organization_ownership_transfers where organization_id = ? and status = 'pending'",
      [organizationId],
    ) as any[];
    if (pending.length) throw new ConflictException('A pending ownership transfer already exists for this organization');

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + dto.expiresInHours * 3_600_000);
    await connection.execute(
      'insert into workspace.organization_ownership_transfers (id, organization_id, from_user_id, to_user_id, former_owner_role, expires_at) values (?, ?, ?, ?, ?, ?)',
      [id, organizationId, fromUserId, dto.toUserId, dto.formerOwnerRole, expiresAt],
    );
    await this.recordAudit(organizationId, userId, 'organization.ownership_transfer_requested', 'ownership_transfer', id, {
      fromUserId,
      toUserId: dto.toUserId,
      formerOwnerRole: dto.formerOwnerRole,
      expiresAt: expiresAt.toISOString(),
    });
    return { id, organizationId, fromUserId, toUserId: dto.toUserId, formerOwnerRole: dto.formerOwnerRole, status: 'pending', expiresAt };
  }

  async acceptOwnershipTransfer(userId: string, organizationId: string, transferId: string) {
    return this.orm.em.fork().transactional(async (em) => {
      const connection = em.getConnection();
      const rows = await connection.execute(
        `select from_user_id as "fromUserId", to_user_id as "toUserId", former_owner_role as "formerOwnerRole"
         from workspace.organization_ownership_transfers
         where id = ? and organization_id = ? and to_user_id = ? and status = 'pending' and expires_at > current_timestamp
         for update`,
        [transferId, organizationId, userId],
      ) as Array<{ fromUserId: string; toUserId: string; formerOwnerRole: OrganizationMemberRole }>;
      if (!rows.length) throw new NotFoundException('Pending ownership transfer was not found');
      const transfer = rows[0];
      const source = await connection.execute(
        'select role from workspace.organization_members where organization_id = ? and user_id = ?',
        [organizationId, transfer.fromUserId],
      ) as Array<{ role: OrganizationRole }>;
      if (source[0]?.role !== 'owner') throw new ConflictException('Transfer source is no longer an owner');
      await connection.execute(
        'update workspace.organization_members set role = ? where organization_id = ? and user_id = ?',
        ['owner', organizationId, transfer.toUserId],
      );
      await connection.execute(
        'update workspace.organization_members set role = ? where organization_id = ? and user_id = ?',
        [transfer.formerOwnerRole, organizationId, transfer.fromUserId],
      );
      await connection.execute(
        "update workspace.organization_ownership_transfers set status = 'accepted', accepted_at = current_timestamp where id = ?",
        [transferId],
      );
      await this.recordAudit(organizationId, userId, 'organization.ownership_transfer_accepted', 'ownership_transfer', transferId, {
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        formerOwnerRole: transfer.formerOwnerRole,
      }, connection);
      return { id: transferId, organizationId, status: 'accepted', newOwnerUserId: transfer.toUserId, formerOwnerUserId: transfer.fromUserId, formerOwnerRole: transfer.formerOwnerRole };
    });
  }

  async cancelOwnershipTransfer(userId: string, organizationId: string, transferId: string) {
    const [transfer] = await this.query(
      "select from_user_id as \"fromUserId\" from workspace.organization_ownership_transfers where id = ? and organization_id = ? and status = 'pending'",
      [transferId, organizationId],
    ) as Array<{ fromUserId: string }>;
    if (!transfer) throw new NotFoundException('Pending ownership transfer was not found');
    if (transfer.fromUserId !== userId && !(await this.isPlatformAdmin(userId))) {
      throw new ForbiddenException('Only the transferring owner can cancel this transfer');
    }
    await this.orm.em.getConnection().execute(
      "update workspace.organization_ownership_transfers set status = 'cancelled', cancelled_at = current_timestamp where id = ?",
      [transferId],
    );
    await this.recordAudit(organizationId, userId, 'organization.ownership_transfer_cancelled', 'ownership_transfer', transferId, {});
    return { id: transferId, status: 'cancelled' };
  }

  async listWorkspaces(userId: string, organizationId: string) {
    await this.requireOrganizationAccess(userId, organizationId);
    return this.query(
      `select id, organization_id as "organizationId", name, slug, created_at as "createdAt", updated_at as "updatedAt"
       from workspace.workspaces where organization_id = ? order by created_at asc`,
      [organizationId],
    );
  }

  async createWorkspace(userId: string, organizationId: string, dto: CreateWorkspaceDto) {
    await this.requireOrganizationAdmin(userId, organizationId);
    const id = randomUUID();
    const slug = dto.slug ?? this.slugify(dto.name);
    await this.ensureWorkspaceSlugAvailable(organizationId, slug);
    await this.orm.em.getConnection().execute('insert into workspace.workspaces (id, organization_id, name, slug) values (?, ?, ?, ?)', [id, organizationId, dto.name, slug]);
    await this.recordAudit(organizationId, userId, 'workspace.created', 'workspace', id, { name: dto.name, slug });
    return { id, organizationId, name: dto.name, slug };
  }

  async updateWorkspace(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    const organizationId = await this.requireWorkspaceAdmin(userId, workspaceId);
    this.requireUpdate(dto);
    if (dto.slug) await this.ensureWorkspaceSlugAvailable(organizationId, dto.slug, workspaceId);
    const result = await this.update('workspace.workspaces', workspaceId, dto, ['name', 'slug']);
    await this.recordAudit(organizationId, userId, 'workspace.updated', 'workspace', workspaceId, result);
    return { id: workspaceId, ...result };
  }

  async deleteWorkspace(userId: string, workspaceId: string) {
    const organizationId = await this.requireWorkspaceAdmin(userId, workspaceId);
    await this.recordAudit(organizationId, userId, 'workspace.deleted', 'workspace', workspaceId, {});
    await this.orm.em.getConnection().execute('delete from workspace.workspaces where id = ?', [workspaceId]);
    return { id: workspaceId, deleted: true };
  }

  async listProjects(userId: string, workspaceId: string) {
    await this.requireWorkspaceAccess(userId, workspaceId);
    return this.query(
      `select id, workspace_id as "workspaceId", name, slug, description, created_by_user_id as "createdByUserId",
              created_at as "createdAt", updated_at as "updatedAt"
       from workspace.projects where workspace_id = ? order by created_at asc`,
      [workspaceId],
    );
  }

  async createProject(userId: string, workspaceId: string, dto: CreateProjectDto) {
    const organizationId = await this.requireWorkspaceWrite(userId, workspaceId);
    const id = randomUUID();
    const slug = dto.slug ?? this.slugify(dto.name);
    await this.ensureProjectSlugAvailable(workspaceId, slug);
    await this.orm.em.getConnection().execute('insert into workspace.projects (id, workspace_id, name, slug, description, created_by_user_id) values (?, ?, ?, ?, ?, ?)', [id, workspaceId, dto.name, slug, dto.description ?? null, userId]);
    await this.recordAudit(organizationId, userId, 'project.created', 'project', id, { name: dto.name, slug });
    return { id, workspaceId, name: dto.name, slug, description: dto.description ?? null, createdByUserId: userId };
  }

  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.requireProjectWrite(userId, projectId);
    this.requireUpdate(dto);
    if (dto.slug) await this.ensureProjectSlugAvailable(project.workspaceId, dto.slug, projectId);
    const result = await this.update('workspace.projects', projectId, dto, ['name', 'slug', 'description']);
    await this.recordAudit(project.organizationId, userId, 'project.updated', 'project', projectId, result);
    return { id: projectId, ...result };
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.requireProjectAdmin(userId, projectId);
    await this.recordAudit(project.organizationId, userId, 'project.deleted', 'project', projectId, {});
    await this.orm.em.getConnection().execute('delete from workspace.projects where id = ?', [projectId]);
    return { id: projectId, deleted: true };
  }

  private async requireOrganizationAccess(userId: string, organizationId: string): Promise<OrganizationRole> {
    if (await this.isPlatformAdmin(userId)) {
      if (!(await this.organizationExists(organizationId))) throw new NotFoundException('Organization was not found');
      return 'owner';
    }
    const role = await this.getOrganizationRole(userId, organizationId);
    if (!role) throw new NotFoundException('Organization was not found');
    return role;
  }

  private async requireOrganizationOwner(userId: string, organizationId: string) {
    if (await this.isPlatformAdmin(userId)) {
      if (!(await this.organizationExists(organizationId))) throw new NotFoundException('Organization was not found');
      return;
    }
    if (await this.getOrganizationRole(userId, organizationId) !== 'owner') throw new ForbiddenException('Organization owner access is required');
  }

  private async requireOrganizationAdmin(userId: string, organizationId: string) {
    const platformAdmin = await this.isPlatformAdmin(userId);
    if (platformAdmin) {
      if (!(await this.organizationExists(organizationId))) throw new NotFoundException('Organization was not found');
      return { role: 'owner' as OrganizationRole, platformAdmin };
    }
    const role = await this.getOrganizationRole(userId, organizationId);
    if (role !== 'owner' && role !== 'admin') throw new ForbiddenException('Organization administrator access is required');
    return { role, platformAdmin };
  }

  private async requireWorkspaceAccess(userId: string, workspaceId: string) {
    const [workspace] = await this.query('select organization_id as "organizationId" from workspace.workspaces where id = ?', [workspaceId]) as Array<{ organizationId: string }>;
    if (!workspace) throw new NotFoundException('Workspace was not found');
    await this.requireOrganizationAccess(userId, workspace.organizationId);
    return workspace.organizationId;
  }

  private async requireWorkspaceAdmin(userId: string, workspaceId: string) {
    const [workspace] = await this.query('select organization_id as "organizationId" from workspace.workspaces where id = ?', [workspaceId]) as Array<{ organizationId: string }>;
    if (!workspace) throw new NotFoundException('Workspace was not found');
    await this.requireOrganizationAdmin(userId, workspace.organizationId);
    return workspace.organizationId;
  }

  private async requireWorkspaceWrite(userId: string, workspaceId: string) {
    const organizationId = await this.requireWorkspaceAccess(userId, workspaceId);
    if (!(await this.isPlatformAdmin(userId)) && await this.getOrganizationRole(userId, organizationId) === 'viewer') {
      throw new ForbiddenException('Workspace write access is required');
    }
    return organizationId;
  }

  private async requireProjectWrite(userId: string, projectId: string) {
    const project = await this.getProjectContext(projectId);
    await this.requireWorkspaceWrite(userId, project.workspaceId);
    return project;
  }

  private async requireProjectAdmin(userId: string, projectId: string) {
    const project = await this.getProjectContext(projectId);
    await this.requireWorkspaceAdmin(userId, project.workspaceId);
    return project;
  }

  private async getProjectContext(projectId: string) {
    const [project] = await this.query(
      `select p.workspace_id as "workspaceId", w.organization_id as "organizationId"
       from workspace.projects p join workspace.workspaces w on w.id = p.workspace_id where p.id = ?`,
      [projectId],
    ) as Array<{ workspaceId: string; organizationId: string }>;
    if (!project) throw new NotFoundException('Project was not found');
    return project;
  }

  private async requireMember(organizationId: string, userId: string) {
    const [member] = await this.query(
      'select role from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, userId],
    ) as Array<{ role: OrganizationRole }>;
    if (!member) throw new NotFoundException('Organization member was not found');
    return member;
  }

  private async getOrganizationRole(userId: string, organizationId: string): Promise<OrganizationRole | undefined> {
    const [member] = await this.query(
      'select role from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, userId],
    ) as Array<{ role: OrganizationRole }>;
    return member?.role;
  }

  private async isPlatformAdmin(userId: string) {
    const [user] = await this.query('select is_platform_admin as "isPlatformAdmin" from auth.users where id = ?', [userId]) as Array<{ isPlatformAdmin: boolean }>;
    return user?.isPlatformAdmin === true;
  }

  private async organizationExists(organizationId: string) {
    const rows = await this.query('select id from workspace.organizations where id = ?', [organizationId]);
    return rows.length > 0;
  }

  private async update(table: string, id: string, dto: object, allowedFields: string[]) {
    const valuesByField = dto as Record<string, unknown>;
    const fields = allowedFields.filter((field) => valuesByField[field] !== undefined);
    const values = fields.map((field) => valuesByField[field]);
    await this.orm.em.getConnection().execute(
      `update ${table} set ${fields.map((field) => `${field} = ?`).join(', ')}, updated_at = current_timestamp where id = ?`,
      [...values, id],
    );
    return Object.fromEntries(fields.map((field) => [field, valuesByField[field]]));
  }

  private requireUpdate(dto: object) {
    if (!Object.values(dto).some((value) => value !== undefined)) throw new BadRequestException('Provide at least one field to update');
  }

  private async ensureOrganizationSlugAvailable(slug: string, currentId?: string) {
    await this.ensureSlugAvailable('workspace.organizations', 'slug = ?', [slug], currentId, 'Organization');
  }

  private async ensureWorkspaceSlugAvailable(organizationId: string, slug: string, currentId?: string) {
    await this.ensureSlugAvailable('workspace.workspaces', 'organization_id = ? and slug = ?', [organizationId, slug], currentId, 'Workspace');
  }

  private async ensureProjectSlugAvailable(workspaceId: string, slug: string, currentId?: string) {
    await this.ensureSlugAvailable('workspace.projects', 'workspace_id = ? and slug = ?', [workspaceId, slug], currentId, 'Project');
  }

  private async ensureSlugAvailable(table: string, condition: string, params: unknown[], currentId: string | undefined, label: string) {
    const sql = `select id from ${table} where ${condition}${currentId ? ' and id <> ?' : ''}`;
    const rows = await this.query(sql, currentId ? [...params, currentId] : params);
    if (rows.length) throw new ConflictException(`${label} slug is already in use`);
  }

  private async recordAudit(organizationId: string | null, actorUserId: string | null, eventType: string, targetType: string, targetId: string | null, metadata: Record<string, unknown>, connection = this.orm.em.getConnection()) {
    await connection.execute(
      'insert into workspace.audit_events (id, organization_id, actor_user_id, event_type, target_type, target_id, metadata) values (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), organizationId, actorUserId, eventType, targetType, targetId, JSON.stringify(metadata)],
    );
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
