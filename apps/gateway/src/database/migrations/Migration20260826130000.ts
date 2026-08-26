import { Migration } from '@mikro-orm/migrations';

export class Migration20260826130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table "workspace"."offboarding_manifests" ("id" uuid not null, "user_id" uuid not null, "requested_by_user_id" uuid not null, "status" varchar(16) not null default \'submitted\', "consent_recorded_at" timestamptz not null, "reviewed_by_user_id" uuid null, "reviewed_at" timestamptz null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "offboarding_manifests_pkey" primary key ("id"), constraint "offboarding_manifests_status_check" check ("status" in (\'submitted\', \'approved\', \'rejected\', \'cancelled\')));');
    this.addSql('alter table "workspace"."offboarding_manifests" add constraint "offboarding_manifests_user_id_foreign" foreign key ("user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('alter table "workspace"."offboarding_manifests" add constraint "offboarding_manifests_requested_by_user_id_foreign" foreign key ("requested_by_user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('alter table "workspace"."offboarding_manifests" add constraint "offboarding_manifests_reviewed_by_user_id_foreign" foreign key ("reviewed_by_user_id") references "auth"."users" ("id") on update cascade;');
    this.addSql('create index "offboarding_manifests_user_created_at_index" on "workspace"."offboarding_manifests" ("user_id", "created_at");');
    this.addSql('create index "offboarding_manifests_status_created_at_index" on "workspace"."offboarding_manifests" ("status", "created_at");');
    this.addSql('create table "workspace"."offboarding_manifest_items" ("id" uuid not null, "manifest_id" uuid not null, "resource_type" varchar(32) not null, "resource_id" varchar(255) not null, "action" varchar(16) not null, "destination_type" varchar(32) not null, "destination_id" uuid null, "created_at" timestamptz not null default current_timestamp, constraint "offboarding_manifest_items_pkey" primary key ("id"), constraint "offboarding_manifest_items_resource_type_check" check ("resource_type" in (\'personal_vault_note\', \'personal_draft\', \'personal_chat\', \'personal_file\')), constraint "offboarding_manifest_items_action_check" check ("action" in (\'delete\', \'archive\', \'transfer\', \'export\')), constraint "offboarding_manifest_items_destination_type_check" check ("destination_type" in (\'none\', \'hermes_archive\', \'gateway_user\', \'organization\', \'departing_user\')));');
    this.addSql('alter table "workspace"."offboarding_manifest_items" add constraint "offboarding_manifest_items_manifest_id_foreign" foreign key ("manifest_id") references "workspace"."offboarding_manifests" ("id") on delete cascade;');
    this.addSql('create unique index "offboarding_manifest_items_one_decision_per_resource" on "workspace"."offboarding_manifest_items" ("manifest_id", "resource_type", "resource_id");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "workspace"."offboarding_manifest_items" cascade;');
    this.addSql('drop table if exists "workspace"."offboarding_manifests" cascade;');
  }
}
