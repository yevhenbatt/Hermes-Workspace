import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';

import {
  CreateOffboardingManifestDto,
  OffboardingManifestItemDto,
} from './dto/create-offboarding-manifest.dto';
import { ReviewOffboardingManifestDto } from './dto/review-offboarding-manifest.dto';
import { CancelOffboardingManifestDto } from './dto/cancel-offboarding-manifest.dto';

type ManifestStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';
type ManifestRecord = {
  id: string;
  userId: string;
  status: ManifestStatus;
  consentRecordedAt: Date;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OffboardingService {
  constructor(private readonly orm: MikroORM) {}

  async createManifest(userId: string, dto: CreateOffboardingManifestDto) {
    if (!dto.consentConfirmed) {
      throw new BadRequestException('Explicit consent is required before submitting an offboarding manifest');
    }
    this.ensureDistinctResources(dto.items);
    for (const item of dto.items) await this.validateItemDestination(userId, item);

    const manifestId = randomUUID();
    const connection = this.orm.em.getConnection();
    await connection.execute(
      `insert into workspace.offboarding_manifests
       (id, user_id, requested_by_user_id, status, consent_recorded_at)
       values (?, ?, ?, 'submitted', current_timestamp)`,
      [manifestId, userId, userId],
    );
    for (const item of dto.items) {
      await connection.execute(
        `insert into workspace.offboarding_manifest_items
         (id, manifest_id, resource_type, resource_id, action, destination_type, destination_id)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), manifestId, item.resourceType, item.resourceId, item.action, item.destinationType, item.destinationId ?? null],
      );
    }
    await this.recordAudit(userId, 'offboarding.manifest_submitted', 'offboarding_manifest', manifestId, {
      itemCount: dto.items.length,
      consentRecorded: true,
    });
    return this.getManifest(manifestId);
  }

  async listOwnManifests(userId: string) {
    const manifests = await this.query(
      `select id, user_id as "userId", status, consent_recorded_at as "consentRecordedAt",
              reviewed_by_user_id as "reviewedByUserId", reviewed_at as "reviewedAt",
              created_at as "createdAt", updated_at as "updatedAt"
       from workspace.offboarding_manifests where user_id = ? order by created_at desc`,
      [userId],
    ) as ManifestRecord[];
    return Promise.all(manifests.map((manifest) => this.withItems(manifest)));
  }

  async cancelManifest(userId: string, manifestId: string, dto: CancelOffboardingManifestDto) {
    if (!dto.confirmed) throw new BadRequestException('Explicit cancellation confirmation is required');
    const manifest = await this.requireManifest(manifestId);
    if (manifest.userId !== userId) throw new ForbiddenException('Only the requesting user can cancel this manifest');
    if (manifest.status !== 'submitted') throw new BadRequestException('Only a submitted manifest can be cancelled');
    await this.orm.em.getConnection().execute(
      "update workspace.offboarding_manifests set status = 'cancelled', updated_at = current_timestamp where id = ?",
      [manifestId],
    );
    await this.recordAudit(userId, 'offboarding.manifest_cancelled', 'offboarding_manifest', manifestId, {});
    return this.getManifest(manifestId);
  }

  async listForReview(actorUserId: string, status?: string) {
    await this.requirePlatformAdmin(actorUserId);
    if (status && !this.isManifestStatus(status)) throw new BadRequestException('Unknown manifest status');
    const manifests = await this.query(
      `select m.id, m.user_id as "userId", u.username, m.status, m.consent_recorded_at as "consentRecordedAt",
              m.reviewed_by_user_id as "reviewedByUserId", reviewer.username as "reviewedByUsername",
              m.reviewed_at as "reviewedAt", m.created_at as "createdAt", m.updated_at as "updatedAt"
       from workspace.offboarding_manifests m
       join auth.users u on u.id = m.user_id
       left join auth.users reviewer on reviewer.id = m.reviewed_by_user_id
       where (? is null or m.status = ?)
       order by m.created_at desc`,
      [status ?? null, status ?? null],
    ) as ManifestRecord[];
    return Promise.all(manifests.map((manifest) => this.withItems(manifest)));
  }

  async reviewManifest(actorUserId: string, manifestId: string, dto: ReviewOffboardingManifestDto) {
    await this.requirePlatformAdmin(actorUserId);
    const manifest = await this.requireManifest(manifestId);
    if (manifest.status !== 'submitted') throw new BadRequestException('Only a submitted manifest can be reviewed');
    await this.orm.em.getConnection().execute(
      'update workspace.offboarding_manifests set status = ?, reviewed_by_user_id = ?, reviewed_at = current_timestamp, updated_at = current_timestamp where id = ?',
      [dto.decision, actorUserId, manifestId],
    );
    await this.recordAudit(actorUserId, `offboarding.manifest_${dto.decision}`, 'offboarding_manifest', manifestId, {
      requestedByUserId: manifest.userId,
    });
    return this.getManifest(manifestId);
  }

  private async getManifest(manifestId: string) {
    const manifest = await this.requireManifest(manifestId);
    return this.withItems(manifest);
  }

  private async withItems<T extends ManifestRecord>(manifest: T) {
    const items = await this.query(
      `select id, resource_type as "resourceType", resource_id as "resourceId", action,
              destination_type as "destinationType", destination_id as "destinationId", created_at as "createdAt"
       from workspace.offboarding_manifest_items where manifest_id = ? order by created_at asc`,
      [manifest.id],
    );
    return { ...manifest, items };
  }

  private async requireManifest(manifestId: string) {
    const [manifest] = await this.query(
      `select id, user_id as "userId", status, consent_recorded_at as "consentRecordedAt",
              reviewed_by_user_id as "reviewedByUserId", reviewed_at as "reviewedAt",
              created_at as "createdAt", updated_at as "updatedAt"
       from workspace.offboarding_manifests where id = ?`,
      [manifestId],
    ) as ManifestRecord[];
    if (!manifest) throw new NotFoundException('Offboarding manifest was not found');
    return manifest;
  }

  private ensureDistinctResources(items: OffboardingManifestItemDto[]) {
    const seen = new Set<string>();
    for (const item of items) {
      const key = `${item.resourceType}:${item.resourceId}`;
      if (seen.has(key)) throw new BadRequestException('Each personal resource may appear only once in a manifest');
      seen.add(key);
    }
  }

  private async validateItemDestination(userId: string, item: OffboardingManifestItemDto) {
    if (item.action === 'delete' && (item.destinationType !== 'none' || item.destinationId)) {
      throw new BadRequestException('Delete action requires destinationType none and no destinationId');
    }
    if (item.action === 'archive' && (item.destinationType !== 'hermes_archive' || item.destinationId)) {
      throw new BadRequestException('Archive action requires Hermes archive and no destinationId');
    }
    if (item.action === 'export' && (item.destinationType !== 'departing_user' || item.destinationId)) {
      throw new BadRequestException('Export action requires departing_user and no destinationId');
    }
    if (item.action !== 'transfer') return;
    if (!item.destinationId || !['gateway_user', 'organization'].includes(item.destinationType)) {
      throw new BadRequestException('Transfer requires a Gateway user or organization destination');
    }
    if (item.destinationType === 'gateway_user') {
      const rows = await this.query('select id from auth.users where id = ? and is_active = true', [item.destinationId]);
      if (!rows.length) throw new NotFoundException('Active transfer recipient was not found');
      return;
    }
    const rows = await this.query(
      'select organization_id from workspace.organization_members where organization_id = ? and user_id = ?',
      [item.destinationId, userId],
    );
    if (!rows.length) throw new ForbiddenException('Transfer destination must be an organization available to the requester');
  }

  private async requirePlatformAdmin(userId: string) {
    const [user] = await this.query(
      'select is_platform_admin as "isPlatformAdmin", is_active as "isActive" from auth.users where id = ?',
      [userId],
    ) as Array<{ isPlatformAdmin: boolean; isActive: boolean }>;
    if (!user?.isActive || !user.isPlatformAdmin) throw new ForbiddenException('Platform administrator access is required');
  }

  private async recordAudit(actorUserId: string, eventType: string, targetType: string, targetId: string, metadata: Record<string, unknown>) {
    await this.orm.em.getConnection().execute(
      'insert into workspace.audit_events (id, organization_id, actor_user_id, event_type, target_type, target_id, metadata) values (?, null, ?, ?, ?, ?, ?)',
      [randomUUID(), actorUserId, eventType, targetType, targetId, JSON.stringify(metadata)],
    );
  }

  private isManifestStatus(value: string): value is ManifestStatus {
    return ['submitted', 'approved', 'rejected', 'cancelled'].includes(value);
  }

  private async query(sql: string, params: unknown[]) {
    return this.orm.em.getConnection().execute(sql, params) as Promise<any[]>;
  }
}
