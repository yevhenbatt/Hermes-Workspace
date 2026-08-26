import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';

import { UpdateUserStatusDto } from './dto/update-user-status.dto';

type UserRecord = {
  id: string;
  username: string;
  isActive: boolean;
  isPlatformAdmin: boolean;
};

@Injectable()
export class AdminService {
  constructor(private readonly orm: MikroORM) {}

  async listUsers(actorUserId: string) {
    await this.requirePlatformAdmin(actorUserId);
    return this.query(
      `select u.id, u.username, u.is_active as "isActive", u.is_platform_admin as "isPlatformAdmin",
              u.created_at as "createdAt", u.updated_at as "updatedAt", count(om.organization_id)::int as "organizationCount"
       from auth.users u
       left join workspace.organization_members om on om.user_id = u.id
       group by u.id
       order by u.created_at asc`,
      [],
    );
  }

  async updateUserStatus(actorUserId: string, userId: string, dto: UpdateUserStatusDto) {
    await this.requirePlatformAdmin(actorUserId);
    const [user] = await this.query(
      'select id, username, is_active as "isActive", is_platform_admin as "isPlatformAdmin" from auth.users where id = ?',
      [userId],
    ) as UserRecord[];
    if (!user) throw new NotFoundException('User was not found');
    if (user.isActive === dto.isActive) return user;
    if (!dto.isActive && userId === actorUserId) {
      throw new BadRequestException('A platform administrator cannot deactivate their own active session');
    }
    if (!dto.isActive && user.isPlatformAdmin) {
      const [count] = await this.query(
        'select count(*)::int as count from auth.users where is_platform_admin = true and is_active = true',
        [],
      ) as Array<{ count: number }>;
      if (count.count <= 1) throw new ConflictException('The last active platform administrator cannot be deactivated');
    }

    await this.orm.em.getConnection().execute(
      'update auth.users set is_active = ?, updated_at = current_timestamp where id = ?',
      [dto.isActive, userId],
    );
    await this.recordAudit(actorUserId, 'platform.user_status_updated', userId, {
      username: user.username,
      fromIsActive: user.isActive,
      toIsActive: dto.isActive,
    });
    return { ...user, isActive: dto.isActive };
  }

  private async requirePlatformAdmin(userId: string) {
    const [user] = await this.query(
      'select is_platform_admin as "isPlatformAdmin", is_active as "isActive" from auth.users where id = ?',
      [userId],
    ) as Array<{ isPlatformAdmin: boolean; isActive: boolean }>;
    if (!user?.isActive || !user.isPlatformAdmin) throw new ForbiddenException('Platform administrator access is required');
  }

  private async recordAudit(actorUserId: string, eventType: string, targetId: string, metadata: Record<string, unknown>) {
    await this.orm.em.getConnection().execute(
      'insert into workspace.audit_events (id, organization_id, actor_user_id, event_type, target_type, target_id, metadata) values (?, null, ?, ?, ?, ?, ?)',
      [randomUUID(), actorUserId, eventType, 'user', targetId, JSON.stringify(metadata)],
    );
  }

  private async query(sql: string, params: unknown[]) {
    return this.orm.em.getConnection().execute(sql, params) as Promise<any[]>;
  }
}
