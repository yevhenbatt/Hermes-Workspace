import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';

import { CreateLocalMaterialSourceDto } from './dto/create-local-material-source.dto';

@Injectable()
export class LocalMaterialsService {
  constructor(private readonly orm: MikroORM) {}

  async listSources(userId: string) {
    return this.query(
      `select id, display_name as "displayName", source_type as "sourceType", mode,
              workspace_id as "workspaceId", created_at as "createdAt", updated_at as "updatedAt"
       from workspace.local_material_sources where user_id = ? order by created_at desc`,
      [userId],
    );
  }

  async createSource(userId: string, dto: CreateLocalMaterialSourceDto) {
    await this.requireActiveUser(userId);
    await this.validateWorkspaceMode(userId, dto);
    const id = randomUUID();
    await this.orm.em.getConnection().execute(
      `insert into workspace.local_material_sources
       (id, user_id, display_name, source_type, mode, workspace_id)
       values (?, ?, ?, ?, ?, ?)`,
      [id, userId, dto.displayName, dto.sourceType, dto.mode, dto.workspaceId ?? null],
    );
    await this.recordAudit(userId, 'local_material_source.registered', id, {
      sourceType: dto.sourceType,
      mode: dto.mode,
      hasWorkspaceTarget: Boolean(dto.workspaceId),
    });
    return this.getSource(userId, id);
  }

  async revokeSource(userId: string, sourceId: string) {
    const source = await this.getSource(userId, sourceId);
    await this.orm.em.getConnection().execute(
      'delete from workspace.local_material_sources where id = ? and user_id = ?',
      [sourceId, userId],
    );
    await this.recordAudit(userId, 'local_material_source.revoked', sourceId, {
      sourceType: source.sourceType,
      mode: source.mode,
    });
    return { id: sourceId, revoked: true };
  }

  private async getSource(userId: string, sourceId: string) {
    const [source] = await this.query(
      `select id, display_name as "displayName", source_type as "sourceType", mode,
              workspace_id as "workspaceId", created_at as "createdAt", updated_at as "updatedAt"
       from workspace.local_material_sources where id = ? and user_id = ?`,
      [sourceId, userId],
    );
    if (!source) throw new NotFoundException('Local material source was not found');
    return source;
  }

  private async validateWorkspaceMode(userId: string, dto: CreateLocalMaterialSourceDto) {
    if (dto.mode !== 'shared_synced' && dto.workspaceId) {
      throw new BadRequestException('workspaceId is allowed only for shared_synced sources');
    }
    if (dto.mode !== 'shared_synced') return;
    if (!dto.workspaceId) throw new BadRequestException('shared_synced sources require workspaceId');

    const [user] = await this.query(
      'select is_platform_admin as "isPlatformAdmin" from auth.users where id = ? and is_active = true',
      [userId],
    ) as Array<{ isPlatformAdmin: boolean }>;
    if (user?.isPlatformAdmin) {
      const rows = await this.query('select id from workspace.workspaces where id = ?', [dto.workspaceId]);
      if (!rows.length) throw new NotFoundException('Workspace was not found');
      return;
    }
    const rows = await this.query(
      `select w.id from workspace.workspaces w
       join workspace.organization_members om on om.organization_id = w.organization_id
       where w.id = ? and om.user_id = ? and om.role in ('owner', 'admin', 'editor')`,
      [dto.workspaceId, userId],
    );
    if (!rows.length) throw new ForbiddenException('Workspace write access is required for shared_synced sources');
  }

  private async requireActiveUser(userId: string) {
    const rows = await this.query('select id from auth.users where id = ? and is_active = true', [userId]);
    if (!rows.length) throw new ForbiddenException('Active user account is required');
  }

  private async recordAudit(actorUserId: string, eventType: string, sourceId: string, metadata: Record<string, unknown>) {
    await this.orm.em.getConnection().execute(
      'insert into workspace.audit_events (id, organization_id, actor_user_id, event_type, target_type, target_id, metadata) values (?, null, ?, ?, ?, ?, ?)',
      [randomUUID(), actorUserId, eventType, 'local_material_source', sourceId, JSON.stringify(metadata)],
    );
  }

  private async query(sql: string, params: unknown[]) {
    return this.orm.em.getConnection().execute(sql, params) as Promise<any[]>;
  }
}
