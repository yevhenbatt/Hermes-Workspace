import { Migration } from '@mikro-orm/migrations';

export class Migration20260826150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table "workspace"."local_material_sources" ("id" uuid not null, "user_id" uuid not null, "display_name" varchar(120) not null, "source_type" varchar(32) not null, "mode" varchar(32) not null, "workspace_id" uuid null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "local_material_sources_pkey" primary key ("id"), constraint "local_material_sources_source_type_check" check ("source_type" in (\'obsidian_vault\', \'directory\', \'file\')), constraint "local_material_sources_mode_check" check ("mode" in (\'local_only\', \'shared_synced\', \'selective_attachment\')));');
    this.addSql('alter table "workspace"."local_material_sources" add constraint "local_material_sources_user_id_foreign" foreign key ("user_id") references "auth"."users" ("id") on delete cascade;');
    this.addSql('alter table "workspace"."local_material_sources" add constraint "local_material_sources_workspace_id_foreign" foreign key ("workspace_id") references "workspace"."workspaces" ("id") on delete set null;');
    this.addSql('create index "local_material_sources_user_created_at_index" on "workspace"."local_material_sources" ("user_id", "created_at");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "workspace"."local_material_sources" cascade;');
  }
}
