import { Migration } from '@mikro-orm/migrations';

export class Migration20260831045328 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "batches" ("id" uuid not null, "status" text check ("status" in ('pending', 'running', 'completed', 'cancelled')) not null default 'pending', "total_count" int not null, "succeeded_count" int not null default 0, "failed_count" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "batches_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "urls" ("id" uuid not null, "batch_id" uuid not null, "url" text not null, "status" text check ("status" in ('queued', 'checking', 'succeeded', 'failed', 'cancelled')) not null default 'queued', "http_status_code" int null, "response_time_ms" int null, "page_title" text null, "error_message" text null, "attempts" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "urls_pkey" primary key ("id"));`,
    );
    this.addSql(`create index "urls_batch_id_index" on "urls" ("batch_id");`);
    this.addSql(`create index "urls_status_index" on "urls" ("status");`);

    this.addSql(
      `alter table "urls" add constraint "urls_batch_id_foreign" foreign key ("batch_id") references "batches" ("id") on update cascade on delete cascade;`,
    );
  }
}
