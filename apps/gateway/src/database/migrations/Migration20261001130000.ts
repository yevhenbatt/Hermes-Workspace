import { Migration } from '@mikro-orm/migrations';

export class Migration20261001130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table "workspace"."provider_connections" ("id" uuid not null, "owner_user_id" uuid not null, "provider" varchar(32) not null, "display_name" varchar(120) not null, "status" varchar(16) not null default \'pending\', "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "provider_connections_pkey" primary key ("id"), constraint "provider_connections_provider_check" check ("provider" in (\'codex\', \'claude\', \'gemini\')), constraint "provider_connections_status_check" check ("status" in (\'pending\', \'active\', \'revoked\')));',
    );
    this.addSql(
      'alter table "workspace"."provider_connections" add constraint "provider_connections_owner_user_id_foreign" foreign key ("owner_user_id") references "auth"."users" ("id") on delete cascade;',
    );
    this.addSql(
      'create index "provider_connections_owner_created_at_index" on "workspace"."provider_connections" ("owner_user_id", "created_at");',
    );
    this.addSql(
      'create table "workspace"."provider_connection_grants" ("id" uuid not null, "connection_id" uuid not null, "organization_id" uuid not null, "workspace_id" uuid null, "grantee_user_id" uuid not null, "status" varchar(16) not null default \'active\', "expires_at" timestamptz null, "consent_recorded_at" timestamptz not null default current_timestamp, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "provider_connection_grants_pkey" primary key ("id"), constraint "provider_connection_grants_status_check" check ("status" in (\'active\', \'revoked\')));',
    );
    this.addSql(
      'alter table "workspace"."provider_connection_grants" add constraint "provider_connection_grants_connection_id_foreign" foreign key ("connection_id") references "workspace"."provider_connections" ("id") on delete cascade;',
    );
    this.addSql(
      'alter table "workspace"."provider_connection_grants" add constraint "provider_connection_grants_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete cascade;',
    );
    this.addSql(
      'alter table "workspace"."provider_connection_grants" add constraint "provider_connection_grants_workspace_id_foreign" foreign key ("workspace_id") references "workspace"."workspaces" ("id") on delete cascade;',
    );
    this.addSql(
      'alter table "workspace"."provider_connection_grants" add constraint "provider_connection_grants_grantee_user_id_foreign" foreign key ("grantee_user_id") references "auth"."users" ("id") on delete cascade;',
    );
    this.addSql(
      'create unique index "provider_connection_grants_unique_scope" on "workspace"."provider_connection_grants" ("connection_id", "organization_id", "workspace_id", "grantee_user_id") nulls not distinct;',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'drop table if exists "workspace"."provider_connection_grants" cascade;',
    );
    this.addSql(
      'drop table if exists "workspace"."provider_connections" cascade;',
    );
  }
}
