import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';

import MIKRO_ORM_CONFIG from './mikro-orm.config';

@Global()
@Module({
  imports: [MikroOrmModule.forRoot(MIKRO_ORM_CONFIG)],
})
export class DatabaseModule {}
