import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';

import { CreateProviderConnectionDto } from './dto/create-provider-connection.dto';
import { CreateProviderConnectionGrantDto } from './dto/create-provider-connection-grant.dto';
import {
  canUseProviderConnection,
  isGrantActive,
  type ProviderConnectionStatus,
} from './provider-connection.policy';

type AccessKind = 'owner' | 'granted';

export interface ProviderConnectionRow {
  id: string;
  ownerUserId: string;
  provider: string;
  displayName: string;
  status: ProviderConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderConnectionGrantRow {
  id: string;
  connectionId: string;
  organizationId: string;
  workspaceId: string | null;
  granteeUserId: string;
  status: string;
  expiresAt: Date | null;
  consentRecordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderConnectionView extends ProviderConnectionRow {
  access: AccessKind;
  canUse: boolean;
  grants: ProviderConnectionGrantRow[];
}

@Injectable()
export class ProviderConnectionsService {
  constructor(private readonly orm: MikroORM) {}

  async createConnection(
    userId: string,
    dto: CreateProviderConnectionDto,
  ): Promise<ProviderConnectionView> {
    const connectionId = randomUUID();
    await this.connection().execute(
      `insert into workspace.provider_connections
       (id, owner_user_id, provider, display_name, status)
       values (?, ?, ?, ?, 'pending')`,
      [connectionId, userId, dto.provider, dto.displayName],
    );
    await this.recordAudit(
      null,
      userId,
      'provider_connection.created',
      connectionId,
      {
        provider: dto.provider,
      },
    );
    return this.getOwnedConnection(userId, connectionId);
  }

  async listConnections(userId: string): Promise<ProviderConnectionView[]> {
    const rows = await this.query<
      ProviderConnectionRow & { access: AccessKind }
    >(
      `select distinct pc.id, pc.owner_user_id as "ownerUserId", pc.provider, pc.display_name as "displayName",
              pc.status, pc.created_at as "createdAt", pc.updated_at as "updatedAt",
              case when pc.owner_user_id = ? then 'owner' else 'granted' end as access
       from workspace.provider_connections pc
       left join workspace.provider_connection_grants pg on pg.connection_id = pc.id
       left join workspace.organization_members om on om.organization_id = pg.organization_id and om.user_id = ?
       where pc.owner_user_id = ?
          or (pg.grantee_user_id = ? and pg.status = 'active' and (pg.expires_at is null or pg.expires_at > current_timestamp) and om.user_id is not null)
       order by pc.created_at desc`,
      [userId, userId, userId, userId],
    );
    return Promise.all(
      rows.map(async (row) => this.toView(row, row.access, userId)),
    );
  }

  async requireExecutionConnection(
    userId: string,
    connectionId: string,
    organizationId: string,
    workspaceId: string | null,
  ): Promise<ProviderConnectionRow> {
    const [connection] = await this.query<ProviderConnectionRow>(
      `select pc.id, pc.owner_user_id as "ownerUserId", pc.provider, pc.display_name as "displayName",
              pc.status, pc.created_at as "createdAt", pc.updated_at as "updatedAt"
       from workspace.provider_connections pc
       where pc.id = ? and pc.status = 'active'
         and (
           pc.owner_user_id = ?
           or exists (
             select 1
             from workspace.provider_connection_grants pg
             join workspace.organization_members om
               on om.organization_id = pg.organization_id and om.user_id = pg.grantee_user_id
             join auth.users u on u.id = om.user_id and u.is_active = true
             where pg.connection_id = pc.id
               and pg.grantee_user_id = ?
               and pg.organization_id = ?
               and pg.status = 'active'
               and (pg.expires_at is null or pg.expires_at > current_timestamp)
               and (pg.workspace_id is null or pg.workspace_id = ?::uuid)
           )
         )`,
      [connectionId, userId, userId, organizationId, workspaceId],
    );
    if (!connection) {
      throw new ForbiddenException(
        'An active provider connection in this workspace is required',
      );
    }
    return connection;
  }

  async createGrant(
    userId: string,
    connectionId: string,
    dto: CreateProviderConnectionGrantDto,
  ): Promise<ProviderConnectionGrantRow> {
    const connection = await this.getOwnedConnection(userId, connectionId);
    if (!dto.sharingConsent) {
      throw new BadRequestException(
        'Explicit owner consent is required to share a provider connection',
      );
    }
    if (connection.ownerUserId === dto.granteeUserId) {
      throw new BadRequestException(
        'The owner already has access to this provider connection',
      );
    }
    await this.requireOrganizationMember(dto.organizationId, dto.granteeUserId);
    if (dto.workspaceId) {
      await this.requireWorkspaceInOrganization(
        dto.workspaceId,
        dto.organizationId,
      );
    }

    const grantId = randomUUID();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Grant expiration must be in the future');
    }
    await this.connection().execute(
      `insert into workspace.provider_connection_grants
       (id, connection_id, organization_id, workspace_id, grantee_user_id, status, expires_at, consent_recorded_at)
       values (?, ?, ?, ?, ?, 'active', ?, current_timestamp)
       on conflict (connection_id, organization_id, workspace_id, grantee_user_id)
       do update set status = 'active', expires_at = excluded.expires_at, consent_recorded_at = current_timestamp, updated_at = current_timestamp`,
      [
        grantId,
        connectionId,
        dto.organizationId,
        dto.workspaceId ?? null,
        dto.granteeUserId,
        expiresAt,
      ],
    );
    const grant = await this.requireGrant(
      connectionId,
      dto.organizationId,
      dto.workspaceId ?? null,
      dto.granteeUserId,
    );
    await this.recordAudit(
      dto.organizationId,
      userId,
      'provider_connection.grant_created',
      connectionId,
      {
        grantId: grant.id,
        granteeUserId: dto.granteeUserId,
        workspaceId: dto.workspaceId ?? null,
        expiresAt: expiresAt?.toISOString() ?? null,
        sharingConsentRecorded: true,
      },
    );
    return grant;
  }

  async revokeGrant(
    userId: string,
    connectionId: string,
    grantId: string,
  ): Promise<{ id: string; revoked: boolean }> {
    await this.getOwnedConnection(userId, connectionId);
    const [grant] = await this.query<ProviderConnectionGrantRow>(
      `select id, connection_id as "connectionId", organization_id as "organizationId", workspace_id as "workspaceId",
              grantee_user_id as "granteeUserId", status, expires_at as "expiresAt", consent_recorded_at as "consentRecordedAt", created_at as "createdAt", updated_at as "updatedAt"
       from workspace.provider_connection_grants where id = ? and connection_id = ?`,
      [grantId, connectionId],
    );
    if (!grant)
      throw new NotFoundException('Provider connection grant was not found');
    await this.connection().execute(
      `update workspace.provider_connection_grants set status = 'revoked', updated_at = current_timestamp where id = ?`,
      [grantId],
    );
    await this.recordAudit(
      grant.organizationId,
      userId,
      'provider_connection.grant_revoked',
      connectionId,
      { grantId },
    );
    return { id: grantId, revoked: true };
  }

  async revokeConnection(
    userId: string,
    connectionId: string,
  ): Promise<{ id: string; revoked: boolean }> {
    await this.getOwnedConnection(userId, connectionId);
    await this.connection().execute(
      `update workspace.provider_connections set status = 'revoked', updated_at = current_timestamp where id = ?`,
      [connectionId],
    );
    await this.connection().execute(
      `update workspace.provider_connection_grants set status = 'revoked', updated_at = current_timestamp where connection_id = ?`,
      [connectionId],
    );
    await this.recordAudit(
      null,
      userId,
      'provider_connection.revoked',
      connectionId,
      {},
    );
    return { id: connectionId, revoked: true };
  }

  private async getOwnedConnection(
    userId: string,
    connectionId: string,
  ): Promise<ProviderConnectionView> {
    const [connection] = await this.query<ProviderConnectionRow>(
      `select id, owner_user_id as "ownerUserId", provider, display_name as "displayName", status,
              created_at as "createdAt", updated_at as "updatedAt"
       from workspace.provider_connections where id = ? and owner_user_id = ?`,
      [connectionId, userId],
    );
    if (!connection)
      throw new NotFoundException('Provider connection was not found');
    return this.toView(connection, 'owner', userId);
  }

  private async toView(
    connection: ProviderConnectionRow,
    access: AccessKind,
    userId: string,
  ): Promise<ProviderConnectionView> {
    const grants = await this.query<ProviderConnectionGrantRow>(
      `select id, connection_id as "connectionId", organization_id as "organizationId", workspace_id as "workspaceId",
              grantee_user_id as "granteeUserId", status, expires_at as "expiresAt", consent_recorded_at as "consentRecordedAt", created_at as "createdAt", updated_at as "updatedAt"
       from workspace.provider_connection_grants where connection_id = ? order by created_at desc`,
      [connection.id],
    );
    const grantActive =
      access === 'owner' ||
      grants.some(
        (grant) =>
          grant.granteeUserId === userId &&
          isGrantActive(grant.status, grant.expiresAt, new Date()),
      );
    return {
      ...connection,
      access,
      canUse: canUseProviderConnection(connection.status, grantActive),
      grants: access === 'owner' ? grants : [],
    };
  }

  private async requireOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const [member] = await this.query<{ userId: string }>(
      `select om.user_id as "userId" from workspace.organization_members om
       join auth.users u on u.id = om.user_id and u.is_active = true
       where om.organization_id = ? and om.user_id = ?`,
      [organizationId, userId],
    );
    if (!member)
      throw new ForbiddenException(
        'The grantee must be an active organization member',
      );
  }

  private async requireWorkspaceInOrganization(
    workspaceId: string,
    organizationId: string,
  ): Promise<void> {
    const [workspace] = await this.query<{ id: string }>(
      'select id from workspace.workspaces where id = ? and organization_id = ?',
      [workspaceId, organizationId],
    );
    if (!workspace)
      throw new NotFoundException(
        'Workspace was not found in the organization',
      );
  }

  private async requireGrant(
    connectionId: string,
    organizationId: string,
    workspaceId: string | null,
    granteeUserId: string,
  ): Promise<ProviderConnectionGrantRow> {
    const [grant] = await this.query<ProviderConnectionGrantRow>(
      `select id, connection_id as "connectionId", organization_id as "organizationId", workspace_id as "workspaceId",
              grantee_user_id as "granteeUserId", status, expires_at as "expiresAt", consent_recorded_at as "consentRecordedAt", created_at as "createdAt", updated_at as "updatedAt"
       from workspace.provider_connection_grants
       where connection_id = ? and organization_id = ? and workspace_id is not distinct from ? and grantee_user_id = ?`,
      [connectionId, organizationId, workspaceId, granteeUserId],
    );
    if (!grant)
      throw new NotFoundException('Provider connection grant was not found');
    return grant;
  }

  private async recordAudit(
    organizationId: string | null,
    actorUserId: string,
    eventType: string,
    connectionId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.connection().execute(
      `insert into workspace.audit_events
       (id, organization_id, actor_user_id, event_type, target_type, target_id, metadata)
       values (?, ?, ?, ?, 'provider_connection', ?, ?)`,
      [
        randomUUID(),
        organizationId,
        actorUserId,
        eventType,
        connectionId,
        JSON.stringify(metadata),
      ],
    );
  }

  private connection() {
    return this.orm.em.getConnection();
  }

  private async query<T>(sql: string, params: unknown[]): Promise<T[]> {
    return this.connection().execute(sql, params) as Promise<T[]>;
  }
}
