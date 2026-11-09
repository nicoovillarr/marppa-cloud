import os from 'os';
import { Prisma } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';
import { HostMetrics } from '@/libs/HostMetrics';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import {
  HostMetricsProbe,
  HostMetricsReading,
} from '../infrastructure/services/HostMetricsProbe';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_RETENTION_HOURS = 168;
const FIRST_SAMPLE_DELAY_MS = 5_000;
const MS_PER_HOUR = 3_600_000;

@Injectable()
export class HostMetricsSampler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private previous: HostMetricsReading | null = null;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly probe: HostMetricsProbe,
  ) {}

  private get intervalMs(): number {
    return readPositiveNumber('HOST_METRICS_INTERVAL_MS', DEFAULT_INTERVAL_MS);
  }

  private get retentionMs(): number {
    return readPositiveNumber('HOST_METRICS_RETENTION_HOURS', DEFAULT_RETENTION_HOURS) * MS_PER_HOUR;
  }

  public onModuleInit(): void {
    if (process.env.USE_STUBS === 'true') {
      this.logger.log('[HostMetricsSampler] Skipped (USE_STUBS=true).');
      return;
    }

    void this.tick(FIRST_SAMPLE_DELAY_MS);
    this.logger.info(`[HostMetricsSampler] Started, sampling every ${this.intervalMs}ms`);
  }

  public onModuleDestroy(): void {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async tick(nextDelayMs: number = this.intervalMs): Promise<void> {
    const started = Date.now();

    try {
      const current = await this.probe.read();

      if (this.previous) {
        await this.persist(this.previous, current);
      }

      this.previous = current;
    } catch (err) {
      this.logger.error(`[HostMetricsSampler] Error: ${String(err)}`);
    }

    if (this.stopped) {
      return;
    }

    const remaining = nextDelayMs - (Date.now() - started);
    this.timer = setTimeout(() => void this.tick(), Math.max(remaining, 0));
  }

  private async persist(previous: HostMetricsReading, current: HostMetricsReading): Promise<void> {
    const hostname = os.hostname();
    const platformCgroups = current.platformCgroups;

    await this.prisma.hostMetricSample.create({
      data: {
        hostname,
        cpuCores: current.cores,
        cpuPercent: HostMetrics.cpuPercent(previous.cpuTimes, current.cpuTimes),
        platformCpuPercent:
          platformCgroups && previous.platformCgroups
            ? HostMetrics.platformCpuPercent(
                previous.platformCgroups,
                platformCgroups,
                current.takenAtUsec - previous.takenAtUsec,
                current.cores,
              )
            : null,
        loadAverage1m: Math.round(current.loadAverage1m * 100) / 100,
        memoryTotalMB: current.memory.totalMB,
        memoryUsedMB: current.memory.usedMB,
        platformMemoryMB: platformCgroups ? HostMetrics.platformMemoryMB(platformCgroups) : null,
        atomVolumePoolGB: current.atomVolumePool?.sizeGB ?? null,
        atomVolumeAllocatedGB: current.atomVolumePool?.allocatedGB ?? null,
        filesystems: current.filesystems as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.hostMetricSample.deleteMany({
      where: { hostname, sampledAt: { lt: new Date(Date.now() - this.retentionMs) } },
    });
  }
}

function readPositiveNumber(variable: string, fallback: number): number {
  const parsed = Number(process.env[variable]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
