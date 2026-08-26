import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { MikroORM } from '@mikro-orm/postgresql';
import { JwtService } from '@nestjs/jwt';

import { PasswordService } from '../../common/security/password/password.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly orm: MikroORM,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByUsername(loginDto.username);
    if (!user?.isActive) throw new UnauthorizedException('Invalid username or password');
    const isPasswordValid = await this.passwordService.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid username or password');
    return this.createLoginResponse(user);
  }

  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    if (process.env.REGISTRATION_MODE === 'invite-only') await this.consumeInvite(registerDto);
    const passwordHash = await this.passwordService.hash(registerDto.password);
    const user = await this.usersService.create(registerDto.username, passwordHash);
    await this.createPersonalWorkspace(user);
    return this.createLoginResponse(user);
  }

  async createInvite(actorUserId: string, dto: CreateInviteDto) {
    const [actor] = await this.orm.em.getConnection().execute('select is_platform_admin from auth.users where id = ?', [actorUserId]) as any[];
    if (!actor?.is_platform_admin) throw new ForbiddenException('Platform administrator access is required');
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + dto.expiresInHours * 3600_000);
    await this.orm.em.getConnection().execute('insert into auth.invitations (id, token_hash, username, created_by_user_id, expires_at) values (?, ?, ?, ?, ?)', [randomUUID(), tokenHash, dto.username?.toLowerCase() ?? null, actorUserId, expiresAt]);
    return { token, expiresAt, username: dto.username?.toLowerCase() ?? null };
  }

  private async consumeInvite(dto: RegisterDto) {
    if (!dto.inviteToken) throw new ForbiddenException('A valid invitation is required');
    const rows = await this.orm.em.getConnection().execute('update auth.invitations set used_at = current_timestamp where token_hash = ? and used_at is null and expires_at > current_timestamp and (username is null or username = ?) returning id', [this.hashToken(dto.inviteToken), dto.username]) as any[];
    if (!rows.length) throw new ForbiddenException('Invitation is invalid, expired, or already used');
  }

  private async createPersonalWorkspace(user: User) {
    const organizationId = randomUUID();
    const workspaceId = randomUUID();
    const slug = user.username;
    const connection = this.orm.em.getConnection();
    await connection.execute('insert into workspace.organizations (id, name, slug, created_by_user_id) values (?, ?, ?, ?)', [organizationId, `${user.username} workspace`, slug, user.id]);
    await connection.execute('insert into workspace.organization_members (organization_id, user_id, role) values (?, ?, ?)', [organizationId, user.id, 'owner']);
    await connection.execute('insert into workspace.workspaces (id, organization_id, name, slug) values (?, ?, ?, ?)', [workspaceId, organizationId, 'Default workspace', 'default']);
  }

  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

  private createLoginResponse(user: User): LoginResponseDto {
    return { accessToken: this.jwtService.sign({ sub: user.id, username: user.username }), refreshToken: 'dummy-refresh-token', expiresIn: 3600 };
  }
}
