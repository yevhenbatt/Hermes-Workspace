import { Migration } from '@mikro-orm/migrations';

export class Migration20261001140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table "workspace"."agent_tasks" add column "executor_type" varchar(32) not null default \'hermes_agent\', add column "provider_connection_id" uuid null;',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_executor_type_check" check ("executor_type" in (\'hermes_agent\', \'swarmclaw\'));',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" add constraint "agent_tasks_provider_connection_id_foreign" foreign key ("provider_connection_id") references "workspace"."provider_connections" ("id") on delete set null;',
    );
    this.addSql(
      'create index "agent_tasks_provider_connection_created_at_index" on "workspace"."agent_tasks" ("provider_connection_id", "created_at");',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table "workspace"."agent_tasks" drop constraint if exists "agent_tasks_provider_connection_id_foreign";',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" drop constraint if exists "agent_tasks_executor_type_check";',
    );
    this.addSql(
      'drop index if exists "workspace"."agent_tasks_provider_connection_created_at_index";',
    );
    this.addSql(
      'alter table "workspace"."agent_tasks" drop column if exists "provider_connection_id", drop column if exists "executor_type";',
    );
  }
}
