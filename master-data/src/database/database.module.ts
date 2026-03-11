import { Global, Module } from '@nestjs/common';
import { createPool, type Pool } from 'mysql2/promise';
import { databaseConfig } from './database.config';

export const WRITE_POOL = 'WRITE_POOL';
export const READ_POOL = 'READ_POOL';

@Global()
@Module({
  providers: [
    {
      provide: WRITE_POOL,
      useFactory: async (): Promise<Pool> => {
        const pool = createPool(databaseConfig.write);
        return pool;
      },
    },
    {
      provide: READ_POOL,
      useFactory: async (): Promise<Pool> => {
        const pool = createPool(databaseConfig.read);
        return pool;
      },
    },
  ],
  exports: [WRITE_POOL, READ_POOL],
})
export class DatabaseModule {}
