import type { PrismaClient } from '@marppa-cloud/db';
import { ResourceStatus } from '@marppa-cloud/db';
import { ILogger, ILOGGER_TOKEN } from '../logger/ILogger';
import { IOrbitService } from '@/orbit/infrastructure/IOrbitService';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';

@Injectable()
export class IPChecker {
  private timer: NodeJS.Timeout | null = null;
  private lastIP: string | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly orbitService: IOrbitService,
    private readonly intervalMs: number = 10 * 60 * 1000,
    
    @Inject(ILOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  start(): void {
    const loop = async () => {
      const started = Date.now();

      try {
        const ip = await this.orbitService.getPublicIPAddress();

        if (ip && ip !== this.lastIP) {
          this.logger.log(`[IPChecker] Public IP changed: ${this.lastIP} → ${ip}`);
          this.lastIP = ip;
        }

        const portals = await this.prisma.portal.findMany({
          where: {
            status: ResourceStatus.ACTIVE,
            OR: [{ lastPublicIP: { not: ip } }, { lastPublicIP: null }],
          },
        });

        if (portals.length > 0) {
          this.logger.log(`[IPChecker] Portals needing DNS update: ${portals.length}`);

          await this.orbitService.batchUpdateDynamicDNS(
            portals.map((p: { id: string; address: string; type: string; apiKey: string }) => ({
              id: p.id,
              address: p.address,
              type: p.type,
              apiKey: p.apiKey,
            })),
            ip,
          );
        }
      } catch (err) {
        this.logger.error(`[IPChecker] Error: ${String(err)}`);
      }

      const elapsed = Date.now() - started;
      const remaining = this.intervalMs - elapsed;
      this.timer = setTimeout(loop, remaining > 0 ? remaining : 0);
    };

    loop();
    this.logger.info('[IPChecker] Started');
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
