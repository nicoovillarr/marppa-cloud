import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';
import { Injectable } from '@/decorators/Injectable';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { ConnectionOptions } from 'tls';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const { DATABASE_URL, DB_CA } = process.env;
    let ssl: ConnectionOptions | undefined;

    if (DB_CA) {
      ssl = {
        ca: DB_CA,
      };
    }

    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['info', 'warn', 'error']
          : ['warn', 'error'],
    });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
