import { ResourceStatus } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { HIVE_SERVICE_TOKEN, HiveService } from '@/worker/domain/services/HiveService';
import { NUCLEUS_SERVICE_TOKEN, NucleusService } from '@/nucleus/domain/services/NucleusService';

const SETTLED_STATES = [ResourceStatus.ACTIVE, ResourceStatus.INACTIVE];

/**
 * A row updated inside this window is likely mid-transition under a processor
 * that hasn't committed yet — comparing against the host now would race it.
 */
const UPDATE_GUARD_MS = 15_000;

@Injectable()
export class DriftReconciler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,

    @Inject(NUCLEUS_SERVICE_TOKEN)
    private readonly nucleusService: NucleusService,
  ) {}

  private get intervalMs(): number {
    const configured = Number(process.env.DRIFT_CHECK_INTERVAL_MS);
    return Number.isFinite(configured) && configured > 0 ? configured : 30_000;
  }

  public onModuleInit(): void {
    const loop = async () => {
      const started = Date.now();

      try {
        const crashedWorkerIds = await this.reconcileWorkers();
        const crashedAtomIds = await this.reconcileAtoms();
        await this.reconcileNodes(crashedWorkerIds, crashedAtomIds);
      } catch (err) {
        this.logger.error(`[DriftReconciler] Error: ${String(err)}`);
      }

      const elapsed = Date.now() - started;
      const remaining = this.intervalMs - elapsed;
      this.timer = setTimeout(loop, remaining > 0 ? remaining : 0);
    };

    loop().catch((err) => this.logger.error(`[DriftReconciler] Loop crashed: ${String(err)}`));
    this.logger.info('[DriftReconciler] Started');
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private updatedBeforeGuard(): Date {
    return new Date(Date.now() - UPDATE_GUARD_MS);
  }

  /** Returns the ids of workers found crashed (DB ACTIVE, VM not running). */
  private async reconcileWorkers(): Promise<string[]> {
    const [rows, running] = await Promise.all([
      this.prisma.worker.findMany({
        where: { status: { in: SETTLED_STATES }, updatedAt: { lt: this.updatedBeforeGuard() } },
        select: { id: true, status: true, ownerId: true },
      }),
      this.hiveService.getRunningWorkers(),
    ]);

    const runningSet = new Set(running);
    const crashed: string[] = [];

    for (const worker of rows) {
      const isRunning = runningSet.has(worker.id);

      if (worker.status === ResourceStatus.ACTIVE && !isRunning) {
        this.logger.warn(`[DriftReconciler] Worker ${worker.id} is ACTIVE in DB but not running — marking INACTIVE`);
        await this.prisma.worker.update({
          where: { id: worker.id },
          data: { status: ResourceStatus.INACTIVE },
        });
        this.wsServer.sendWorkerMessage(worker, 'UPDATED', {
          status: ResourceStatus.INACTIVE,
          reason: 'DRIFT_DETECTED',
        });
        crashed.push(worker.id);
        continue;
      }

      if (worker.status === ResourceStatus.INACTIVE && isRunning) {
        this.logger.warn(`[DriftReconciler] Worker ${worker.id} is INACTIVE in DB but running — enforcing stop`);
        await this.hiveService.forceStopWorker(worker.id);
      }
    }

    return crashed;
  }

  /** Returns the ids of atoms found crashed (DB ACTIVE, container not running). */
  private async reconcileAtoms(): Promise<string[]> {
    const [rows, running] = await Promise.all([
      this.prisma.atom.findMany({
        where: { status: { in: SETTLED_STATES }, updatedAt: { lt: this.updatedBeforeGuard() } },
        select: { id: true, status: true, ownerId: true },
      }),
      this.nucleusService.getRunningAtoms(),
    ]);

    const runningSet = new Set(running);
    const crashed: string[] = [];

    for (const atom of rows) {
      const isRunning = runningSet.has(atom.id);

      if (atom.status === ResourceStatus.ACTIVE && !isRunning) {
        this.logger.warn(`[DriftReconciler] Atom ${atom.id} is ACTIVE in DB but not running — marking INACTIVE`);
        await this.prisma.atom.update({
          where: { id: atom.id },
          data: { status: ResourceStatus.INACTIVE },
        });
        this.wsServer.sendAtomMessage(atom, 'UPDATED', {
          status: ResourceStatus.INACTIVE,
          reason: 'DRIFT_DETECTED',
        });
        crashed.push(atom.id);
        continue;
      }

      if (atom.status === ResourceStatus.INACTIVE && isRunning) {
        this.logger.warn(`[DriftReconciler] Atom ${atom.id} is INACTIVE in DB but running — enforcing stop`);
        await this.nucleusService.stopAtom(atom.id);
      }
    }

    return crashed;
  }

  /**
   * A Node has no host state of its own — its liveness follows the worker or
   * atom sitting on it. It is not torn down (no DHCP/bridge changes): the VM
   * or container can still reattach cleanly on the next START.
   */
  private async reconcileNodes(crashedWorkerIds: string[], crashedAtomIds: string[]): Promise<void> {
    if (crashedWorkerIds.length === 0 && crashedAtomIds.length === 0) return;

    const nodes = await this.prisma.node.findMany({
      where: {
        status: ResourceStatus.ACTIVE,
        OR: [
          { workerId: { in: crashedWorkerIds } },
          { atomId: { in: crashedAtomIds } },
        ],
      },
      select: { id: true, zone: { select: { ownerId: true } } },
    });

    for (const node of nodes) {
      this.logger.warn(`[DriftReconciler] Node ${node.id} lost its worker/atom — marking INACTIVE`);
      await this.prisma.node.update({
        where: { id: node.id },
        data: { status: ResourceStatus.INACTIVE },
      });
      this.wsServer.sendNodeMessage(
        { id: node.id, ownerId: node.zone.ownerId },
        'UPDATED',
        { status: ResourceStatus.INACTIVE, reason: 'DRIFT_DETECTED' },
      );
    }
  }
}
