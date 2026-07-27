import { ResourceStatus } from '@marppa-cloud/db';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '@/orbit/domain/services/OrbitService';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../../shared/infrastructure/services/LoggerService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

@Injectable()
export class IPChecker implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private lastIP: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) {}

  /** How often to re-check the host's public IP, in ms. */
  private get intervalMs(): number {
    const configured = Number(process.env.IP_CHECK_INTERVAL_MS);
    return Number.isFinite(configured) && configured > 0 ? configured : 600_000;
  }

  public onModuleInit(): void {
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

          await this.orbitService.batchSyncPortalDns(
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

    loop().catch((err) => this.logger.error(`[IPChecker] Loop crashed: ${String(err)}`));
    this.logger.info('[IPChecker] Started');
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
