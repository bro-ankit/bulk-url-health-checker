import { Migration } from '@mikro-orm/migrations';

export class Migration20260831132600 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "batches" add column "name" text null;`);
    this.addSql(`update "batches" set "name" = "id"::text where "name" is null;`);
    this.addSql(`alter table "batches" alter column "name" set not null;`);
    this.addSql(`alter table "batches" add constraint "batches_name_unique" unique ("name");`);
  }
}
