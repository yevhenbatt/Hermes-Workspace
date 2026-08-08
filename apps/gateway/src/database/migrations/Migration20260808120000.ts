import { Migration } from '@mikro-orm/migrations';

export class Migration20260808120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql('create table "auth"."users" ("id" uuid not null, "username" varchar(64) not null, "password_hash" varchar(255) not null, "is_active" boolean not null default true, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, constraint "users_pkey" primary key ("id"));');
    this.addSql('alter table "auth"."users" add constraint "users_username_unique" unique ("username");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "auth"."users" cascade;');
  }
}
