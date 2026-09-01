import { MikroORM } from '@mikro-orm/postgresql';
import { BatchEntity, UrlEntity } from '@bulk-url-health-checker/shared-contracts';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Real Postgres via testcontainers, not a mocked EntityManager. Repositories exist to wrap real
 * SQL (nativeUpdate, createQueryBuilder), so a mock of the thing they wrap would only prove the
 * mock was called, never that the SQL is correct.
 */
export class DatabaseTestEnvironment {
  private container!: StartedPostgreSqlContainer;
  orm!: MikroORM;

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer('postgres:16-alpine').start();

    this.orm = await MikroORM.init({
      entities: [BatchEntity, UrlEntity],
      host: this.container.getHost(),
      port: this.container.getPort(),
      user: this.container.getUsername(),
      password: this.container.getPassword(),
      dbName: this.container.getDatabase(),
    });

    await this.orm.schema.createSchema();
  }

  async stop(): Promise<void> {
    await this.orm.close();
    await this.container.stop();
  }

  async clear(): Promise<void> {
    await this.orm.schema.clearDatabase();
  }
}
