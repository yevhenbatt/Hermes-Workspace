import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';

import { SelectDesktopContextDto } from './dto/select-desktop-context.dto';

type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'platform_admin';

type ProjectTreeItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdByUserId: string | null;
};

type WorkspaceTreeItem = {
  id: string;
  name: string;
  slug: string;
  projects: ProjectTreeItem[];
};

type OrganizationTreeItem = {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  workspaces: WorkspaceTreeItem[];
};

type DesktopContext = {
  organizationId: string;
  workspaceId: string | null;
  projectId: string | null;
};

@Injectable()
export class DesktopService {
  constructor(private readonly orm: MikroORM) {}

  async bootstrap(userId: string) {
    const user = await this.requireActiveUser(userId);
    const organizations = await this.getOrganizationTree(user.id, user.isPlatformAdmin);
    const savedContext = await this.getSavedContext(user.id);
    const context = this.resolveContext(organizations, savedContext);

    return {
      user: {
        id: user.id,
        username: user.username,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      organizations,
      context,
      capabilities: {
        workspaceCore: true,
        offboardingManifests: true,
        agentHealth: true,
        localMaterialsConnector: false,
      },
    };
  }

  async selectContext(userId: string, dto: SelectDesktopContextDto) {
    const user = await this.requireActiveUser(userId);
    await this.requireOrganizationAccess(user.id, user.isPlatformAdmin, dto.organizationId);

    if (dto.projectId && !dto.workspaceId) {
      throw new BadRequestException('projectId requires workspaceId');
    }
    if (dto.workspaceId) await this.requireWorkspace(dto.organizationId, dto.workspaceId);
    if (dto.projectId && dto.workspaceId) await this.requireProject(dto.workspaceId, dto.projectId);

    await this.orm.em.getConnection().execute(
      `insert into workspace.desktop_user_contexts (user_id, organization_id, workspace_id, project_id)
       values (?, ?, ?, ?)
       on conflict (user_id) do update set
         organization_id = excluded.organization_id,
         workspace_id = excluded.workspace_id,
         project_id = excluded.project_id,
         updated_at = current_timestamp`,
      [user.id, dto.organizationId, dto.workspaceId ?? null, dto.projectId ?? null],
    );
    return {
      organizationId: dto.organizationId,
      workspaceId: dto.workspaceId ?? null,
      projectId: dto.projectId ?? null,
      persisted: true,
    };
  }

  private async getOrganizationTree(userId: string, isPlatformAdmin: boolean) {
    const organizations = isPlatformAdmin
      ? await this.query(
          `select o.id, o.name, o.slug, 'platform_admin' as role
           from workspace.organizations o order by o.created_at asc`,
          [],
        ) as Array<Omit<OrganizationTreeItem, 'workspaces'>>
      : await this.query(
          `select o.id, o.name, o.slug, om.role
           from workspace.organizations o
           join workspace.organization_members om on om.organization_id = o.id
           where om.user_id = ? order by o.created_at asc`,
          [userId],
        ) as Array<Omit<OrganizationTreeItem, 'workspaces'>>;

    return Promise.all(organizations.map(async (organization) => ({
      ...organization,
      workspaces: await this.getWorkspaces(organization.id),
    })));
  }

  private async getWorkspaces(organizationId: string) {
    const workspaces = await this.query(
      `select id, name, slug from workspace.workspaces where organization_id = ? order by created_at asc`,
      [organizationId],
    ) as Array<Omit<WorkspaceTreeItem, 'projects'>>;
    return Promise.all(workspaces.map(async (workspace) => ({
      ...workspace,
      projects: await this.getProjects(workspace.id),
    })));
  }

  private async getProjects(workspaceId: string) {
    return this.query(
      `select id, name, slug, description, created_by_user_id as "createdByUserId"
       from workspace.projects where workspace_id = ? order by created_at asc`,
      [workspaceId],
    ) as Promise<ProjectTreeItem[]>;
  }

  private async getSavedContext(userId: string): Promise<DesktopContext | null> {
    const [context] = await this.query(
      `select organization_id as "organizationId", workspace_id as "workspaceId", project_id as "projectId"
       from workspace.desktop_user_contexts where user_id = ?`,
      [userId],
    ) as DesktopContext[];
    return context ?? null;
  }

  private resolveContext(organizations: OrganizationTreeItem[], savedContext: DesktopContext | null) {
    if (savedContext && this.isValidContext(organizations, savedContext)) {
      return { ...savedContext, persisted: true };
    }
    const organization = organizations[0];
    const workspace = organization?.workspaces[0];
    const project = workspace?.projects[0];
    return {
      organizationId: organization?.id ?? null,
      workspaceId: workspace?.id ?? null,
      projectId: project?.id ?? null,
      persisted: false,
    };
  }

  private isValidContext(organizations: OrganizationTreeItem[], context: DesktopContext) {
    const organization = organizations.find((item) => item.id === context.organizationId);
    if (!organization) return false;
    if (!context.workspaceId) return !context.projectId;
    const workspace = organization.workspaces.find((item) => item.id === context.workspaceId);
    if (!workspace) return false;
    return !context.projectId || workspace.projects.some((item) => item.id === context.projectId);
  }

  private async requireActiveUser(userId: string) {
    const [user] = await this.query(
      `select id, username, is_active as "isActive", is_platform_admin as "isPlatformAdmin"
       from auth.users where id = ?`,
      [userId],
    ) as Array<{ id: string; username: string; isActive: boolean; isPlatformAdmin: boolean }>;
    if (!user) throw new NotFoundException('User was not found');
    if (!user.isActive) throw new ForbiddenException('User account is inactive');
    return user;
  }

  private async requireOrganizationAccess(userId: string, isPlatformAdmin: boolean, organizationId: string) {
    if (isPlatformAdmin) {
      const rows = await this.query('select id from workspace.organizations where id = ?', [organizationId]);
      if (!rows.length) throw new NotFoundException('Organization was not found');
      return;
    }
    const rows = await this.query(
      'select organization_id from workspace.organization_members where organization_id = ? and user_id = ?',
      [organizationId, userId],
    );
    if (!rows.length) throw new ForbiddenException('Organization access is required');
  }

  private async requireWorkspace(organizationId: string, workspaceId: string) {
    const rows = await this.query('select id from workspace.workspaces where id = ? and organization_id = ?', [workspaceId, organizationId]);
    if (!rows.length) throw new NotFoundException('Workspace was not found in the selected organization');
  }

  private async requireProject(workspaceId: string, projectId: string) {
    const rows = await this.query('select id from workspace.projects where id = ? and workspace_id = ?', [projectId, workspaceId]);
    if (!rows.length) throw new NotFoundException('Project was not found in the selected Workspace');
  }

  private async query(sql: string, params: unknown[]) {
    return this.orm.em.getConnection().execute(sql, params) as Promise<any[]>;
  }
}
