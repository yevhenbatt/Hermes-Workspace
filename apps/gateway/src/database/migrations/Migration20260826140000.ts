import { Migration } from '@mikro-orm/migrations';

export class Migration20260826140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table "workspace"."desktop_user_contexts" ("user_id" uuid not null, "organization_id" uuid null, "workspace_id" uuid null, "project_id" uuid null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "desktop_user_contexts_pkey" primary key ("user_id"));');
    this.addSql('alter table "workspace"."desktop_user_contexts" add constraint "desktop_user_contexts_user_id_foreign" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;');
    this.addSql('alter table "workspace"."desktop_user_contexts" add constraint "desktop_user_contexts_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete set null;');
    this.addSql('alter table "workspace"."desktop_user_contexts" add constraint "desktop_user_contexts_workspace_id_foreign" foreign key ("workspace_id") references "workspace"."workspaces" ("id") on delete set null;');
    this.addSql('alter table "workspace"."desktop_user_contexts" add constraint "desktop_user_contexts_project_id_foreign" foreign key ("project_id") references "workspace"."projects" ("id") on delete set null;');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "workspace"."desktop_user_contexts" cascade;');
  }
}
