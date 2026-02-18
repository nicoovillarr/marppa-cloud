import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Utils } from 'src/libs/utils';
import { Pool } from 'pg';
import { ConnectionOptions } from 'tls';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const dbCARoute = process.env.DB_CA_ROUTE;
    let ssl: ConnectionOptions | undefined;

    if (dbCARoute) {
      const caPath = path.resolve(process.cwd(), dbCARoute);
      if (fs.existsSync(caPath)) {
        ssl = {
          ca: fs.readFileSync(caPath).toString(),
        };
      }
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });

    this.pool = pool;

    return this.$extends({
      name: 'customIdMiddleware',
      query: {
        $allModels: {
          create: async ({ args, model, query }) => {
            this.processIds(model, args.data);
            return query(args);
          },
        },
      },
    }) as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  private processIds(model: string, data: any): void {
    const prefix = {
      Company: 'c-',
      User: 'u-',
      Worker: 'w-',
      Bit: 'b-',
      Zone: 'z-',
      Node: 'n-',
      Portal: 'p-',
      Transponder: 't-',
    };

    if (
      prefix[model] &&
      data &&
      typeof data === 'object' &&
      (!('id' in data) || data.id == null)
    ) {
      data.id = data.id || Utils.generateUUID(prefix[model], 6);
    }

    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        if (
          data[key] &&
          typeof data[key] === 'object' &&
          'create' in data[key]
        ) {
          this.processIds(key.capitalize(), data[key]['create']);
        }
      });
    }
  }
}
