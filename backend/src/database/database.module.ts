import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

/**
 * Pool config for scale: 1000 TVs = many concurrent requests.
 * Use DATABASE_URL (Supabase pooler port 6543) in production to limit connections.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      useFactory: (configService: ConfigService): Pool => {
        const connectionString = configService.get<string>('DATABASE_URL');
        const baseConfig = connectionString
          ? { connectionString }
          : {
              host: configService.get<string>('DB_HOST') || 'localhost',
              port: configService.get<number>('DB_PORT') || 5432,
              database: configService.get<string>('DB_NAME') || 'tvproje',
              user: configService.get<string>('DB_USER') || 'postgres',
              password: configService.get<string>('DB_PASSWORD') || '333333',
            };
        const pool = new Pool({
          ...baseConfig,
          max: configService.get<number>('DB_POOL_MAX') ?? 20,
          idleTimeoutMillis: configService.get<number>('DB_POOL_IDLE_TIMEOUT') ?? 10000,
          connectionTimeoutMillis: configService.get<number>('DB_POOL_CONNECT_TIMEOUT') ?? 5000,
        });
        return pool;
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ['DATABASE_POOL', DatabaseService],
})
export class DatabaseModule {}
