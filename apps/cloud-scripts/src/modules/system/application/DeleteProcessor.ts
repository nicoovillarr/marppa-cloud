import { Prisma } from '@marppa-cloud/db';
import { ResourceStatus } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../../shared/infrastructure/services/LoggerService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

@Injectable()
export class DeleteProcessor implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly intervalMs: number = 5 * 60 * 1000,
    private readonly logger: LoggerService,
  ) {}

  public onModuleInit(): void {
    const loop = async () => {
      const started = Date.now();

      try {
        const rows = await this.prisma.$queryRawUnsafe<
          { table_name: string }[]
        >(`
          SELECT table_name
          FROM information_schema.columns
          WHERE column_name = 'status'
            AND udt_name = 'ResourceStatus'
        `);

        const tablesToCheck = rows.map((row) => row.table_name);

        const seconds = Math.floor(this.intervalMs / 1000);

        for (const table of tablesToCheck) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
            this.logger.warn(
              `[DeleteProcessor] Skipping unexpected table name: "${table}"`,
            );
            continue;
          }

          this.logger.log(
            `[DeleteProcessor] Cleaning DELETED rows from "${table}"`,
          );

          await this.prisma.$executeRaw`
            DELETE FROM ${Prisma.raw(`"${table}"`)}
            WHERE "status" = ${ResourceStatus.DELETED}::"ResourceStatus"
              AND "updatedAt" < (NOW() AT TIME ZONE 'UTC') - (${seconds} * INTERVAL '1 SECOND')
          `;
        }
      } catch (err) {
        this.logger.error(
          `[DeleteProcessor] Error during cleanup: ${String(err)}`,
        );
      }

      const elapsed = Date.now() - started;
      const remaining = this.intervalMs - elapsed;
      this.timer = setTimeout(loop, remaining > 0 ? remaining : 0);
    };

    loop().catch((err) => this.logger.error(`[DeleteProcessor] Loop crashed: ${String(err)}`));
    this.logger.info('[DeleteProcessor] Started');
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
