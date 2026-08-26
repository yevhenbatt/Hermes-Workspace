import { Migration } from '@mikro-orm/migrations';

export class Migration20260826120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table "workspace"."organization_ownership_transfers" ("id" uuid not null, "organization_id" uuid not null, "from_user_id" uuid not null, "to_user_id" uuid not null, "former_owner_role" varchar(16) not null, "status" varchar(16) not null default \'pending\', "expires_at" timestamptz not null, "accepted_at" timestamptz null, "cancelled_at" timestamptz null, "created_at" timestamptz not null default current_timestamp, constraint "organization_ownership_transfers_pkey" primary key ("id"), constraint "organization_ownership_transfers_former_role_check" check ("former_owner_role" in (\'admin\', \'viewer\')), constraint "organization_ownership_transfers_status_check" check ("status" in (\'pending\', \'accepted\', \'cancelled\', \'expired\')));');
    this.addSql('alter table "workspace"."organization_ownership_transfers" add constraint "organization_ownership_transfers_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete cascade;');
    this.addSql('alter table "workspace"."organization_ownership_transfers" add constraint "organization_ownership_transfers_from_user_id_foreign" foreign key ("from_user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('alter table "workspace"."organization_ownership_transfers" add constraint "organization_ownership_transfers_to_user_id_foreign" foreign key ("to_user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('create unique index "organization_ownership_transfers_one_pending_per_org" on "workspace"."organization_ownership_transfers" ("organization_id") where "status" = \'pending\';');
    this.addSql('create table "workspace"."audit_events" ("id" uuid not null, "organization_id" uuid null, "actor_user_id" uuid null, "event_type" varchar(96) not null, "target_type" varchar(64) not null, "target_id" uuid null, "metadata" jsonb not null default \'{}\', "created_at" timestamptz not null default current_timestamp, constraint "audit_events_pkey" primary key ("id"));');
    this.addSql('alter table "workspace"."audit_events" add constraint "audit_events_organization_id_foreign" foreign key ("organization_id") references "workspace"."organizations" ("id") on delete set null;');
    this.addSql('alter table "workspace"."audit_events" add constraint "audit_events_actor_user_id_foreign" foreign key ("actor_user_id") references "auth"."users" ("id") on delete set null;');
    this.addSql('create index "audit_events_organization_created_at_index" on "workspace"."audit_events" ("organization_id", "created_at");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "workspace"."audit_events" cascade;');
    this.addSql('drop table if exists "workspace"."organization_ownership_transfers" cascade;');
  }
}
