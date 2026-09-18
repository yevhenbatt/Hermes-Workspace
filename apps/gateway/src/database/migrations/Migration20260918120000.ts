import { Migration } from '@mikro-orm/migrations';

export class Migration20260918120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table "workspace"."agent_tasks" ("id" uuid not null, "organization_id" uuid not null, "workspace_id" uuid null, "project_id" uuid null, "created_by_user_id" uuid not null, "agent_run_id" varchar(96) null, "status" varchar(32) not null, "input" text not null, "output" text null, "error" text null, "usage" jsonb null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "completed_at" timestamptz null, constraint "agent_tasks_pkey" primary key ("id"), constraint "agent_tasks_status_check" check ("status" in (\'queued\', \'running\', \'waiting_for_approval\', \'stopping\', \'completed\', \'failed\', \'cancelled\')));',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete cascade;',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_workspace_id_foreign" foreign key ("workspace_id") references "workspace"."workspaces" ("id") on delete set null;',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_project_id_foreign" foreign key ("project_id") references "workspace"."projects" ("id") on delete set null;',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_created_by_user_id_foreign" foreign key ("created_by_user_id") references "auth"."users" ("id") on update cascade;',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_agent_run_id_unique" unique ("agent_run_id");',
    );
    this.addSql(
      'create index "agent_tasks_organization_created_at_index" on "workspace"."agent_tasks" ("organization_id", "created_at");',
    );
    this.addSql(
      'create index "agent_tasks_workspace_created_at_index" on "workspace"."agent_tasks" ("workspace_id", "created_at");',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "workspace"."agent_tasks" cascade;');
  }
}
