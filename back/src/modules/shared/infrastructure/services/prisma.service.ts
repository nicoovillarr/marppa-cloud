import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Utils } from 'src/libs/utils';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });

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
