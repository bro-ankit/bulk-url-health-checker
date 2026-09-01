import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import type { OnModuleInit } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';

import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';
import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';
import MIKRO_ORM_CONFIG from './mikro-orm.config';
import { AdvisoryLockKeyUtil } from './advisory-lock-key.util';
import { DATABASE_MIGRATIONS_LOCK_NAME } from './database.constants';

@Global()
@Module({
  imports: [MikroOrmModule.forRoot(MIKRO_ORM_CONFIG)],
})
export class DatabaseModule implements OnModuleInit {
  private static readonly MIGRATION_LOCK_KEY = AdvisoryLockKeyUtil.fromName(DATABASE_MIGRATIONS_LOCK_NAME);

  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    this.logger.info({}, 'Running database migrations...');

    const connection = this.orm.em.getConnection();
    await connection.execute('SELECT pg_advisory_lock(?, ?)', DatabaseModule.MIGRATION_LOCK_KEY);
    try {
      await this.orm.migrator.up();
    } finally {
      await connection.execute('SELECT pg_advisory_unlock(?, ?)', DatabaseModule.MIGRATION_LOCK_KEY);
    }

    this.logger.info({}, 'Migrations complete.');
  }
}
