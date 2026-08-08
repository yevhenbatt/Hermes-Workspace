import { Migration } from '@mikro-orm/migrations';

export class Migration20260808130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "auth"."users" add column "is_platform_admin" boolean not null default false;');
    this.addSql('create table "auth"."invitations" ("id" uuid not null, "token_hash" varchar(64) not null, "username" varchar(64) null, "created_by_user_id" uuid not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null default current_timestamp, constraint "invitations_pkey" primary key ("id"));');
    this.addSql('alter table "auth"."invitations" add constraint "invitations_token_hash_unique" unique ("token_hash");');
    this.addSql('alter table "auth"."invitations" add constraint "invitations_created_by_user_id_foreign" foreign key ("created_by_user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('create table "workspace"."organizations" ("id" uuid not null, "name" varchar(120) not null, "slug" varchar(80) not null, "created_by_user_id" uuid not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "organizations_pkey" primary key ("id"));');
    this.addSql('alter table "workspace"."organizations" add constraint "organizations_slug_unique" unique ("slug");');
    this.addSql('alter table "workspace"."organizations" add constraint "organizations_created_by_user_id_foreign" foreign key ("created_by_user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('create table "workspace"."organization_members" ("organization_id" uuid not null, "user_id" uuid not null, "role" varchar(16) not null, "created_at" timestamptz not null default current_timestamp, constraint "organization_members_pkey" primary key ("organization_id", "user_id"), constraint "organization_members_role_check" check ("role" in (\'owner\', \'admin\', \'editor\', \'viewer\')));');
    this.addSql('alter table "workspace"."organization_members" add constraint "organization_members_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete cascade;');
    this.addSql('alter table "workspace"."organization_members" add constraint "organization_members_user_id_foreign" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;');
    this.addSql('create table "workspace"."workspaces" ("id" uuid not null, "organization_id" uuid not null, "name" varchar(120) not null, "slug" varchar(80) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "workspaces_pkey" primary key ("id"), constraint "workspaces_organization_slug_unique" unique ("organization_id", "slug"));');
    this.addSql('alter table "workspace"."workspaces" add constraint "workspaces_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete cascade;');
    this.addSql('create table "workspace"."projects" ("id" uuid not null, "workspace_id" uuid not null, "name" varchar(160) not null, "slug" varchar(100) not null, "description" text null, "created_by_user_id" uuid not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "projects_pkey" primary key ("id"), constraint "projects_workspace_slug_unique" unique ("workspace_id", "slug"));');
    this.addSql('alter table "workspace"."projects" add constraint "projects_workspace_id_foreign" foreign key ("workspace_id") references "workspace"."workspaces" ("id") on delete cascade;');
    this.addSql('alter table "workspace"."projects" add constraint "projects_created_by_user_id_foreign" foreign key ("created_by_user_id") references "auth"."users" ("id") on update cascade;');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "workspace"."projects" cascade;');
    this.addSql('drop table if exists "workspace"."workspaces" cascade;');
    this.addSql('drop table if exists "workspace"."organization_members" cascade;');
    this.addSql('drop table if exists "workspace"."organizations" cascade;');
    this.addSql('drop table if exists "auth"."invitations" cascade;');
    this.addSql('alter table "auth"."users" drop column if exists "is_platform_admin";');
  }
}
