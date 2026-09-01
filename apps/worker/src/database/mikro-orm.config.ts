import { defineConfig } from '@mikro-orm/postgresql';
import { BatchEntity, UrlEntity } from '@bulk-url-health-checker/shared-contracts';

import { ENV_VARIABLES } from '../constants/env.constants';

export default defineConfig({
  entities: [BatchEntity, UrlEntity],
  host: process.env[ENV_VARIABLES.DATABASE.HOST] ?? 'localhost',
  port: Number(process.env[ENV_VARIABLES.DATABASE.PORT] ?? 5433),
  user: process.env[ENV_VARIABLES.DATABASE.USER] ?? 'app',
  password: process.env[ENV_VARIABLES.DATABASE.PASSWORD] ?? 'app',
  dbName: process.env[ENV_VARIABLES.DATABASE.NAME] ?? 'bulk_url_health_checker',
});
