import { EventType, ResourceStatus } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { MESH_SERVICE_TOKEN, MeshService } from '@/mesh/domain/services/MeshService';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '@/orbit/domain/services/OrbitService';
import { HIVE_SERVICE_TOKEN, HiveService } from '@/worker/domain/services/HiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { HostPreflightService } from '../infrastructure/services/HostPreflightService';

@EventProcessor(EventType.SYSTEM_RESET)
export class SystemResetProcessor implements IEventProcessor {

  constructor(
    private readonly logger: LoggerService,

    private readonly preflightService: HostPreflightService,

    private readonly prisma: PrismaService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) {}

  public async handle(event: EventPayload): Promise<void> {
    try {
      await this.preflightService.run();

      const alive = { status: { not: ResourceStatus.DELETED } };
      const active = { status: ResourceStatus.ACTIVE };

      const [workers, zones, protectedZones, fibers, portals] = await Promise.all([
        this.prisma.worker.findMany({ where: alive, select: { id: true } }),
        this.prisma.zone.findMany({
          where: active,
          select: { id: true, cidr: true, gateway: true },
        }),
        this.prisma.zone.findMany({ where: alive, select: { id: true } }),
        this.prisma.fiber.findMany({
          where: { ...active, hostPort: { not: null }, node: active },
          select: {
            protocol: true,
            hostPort: true,
            targetPort: true,
            node: { select: { ipAddress: true } },
          },
        }),
        this.prisma.portal.findMany({ where: alive, select: { id: true } }),
      ]);

      const removedWorkers = await this.hiveService.reconcileWorkers(
        workers.map((worker) => worker.id),
      );

      const { removedZones } = await this.meshService.reconcileMesh(
        zones,
        fibers.map((fiber) => ({
          protocol: fiber.protocol,
          hostPort: fiber.hostPort as number,
          targetIp: fiber.node.ipAddress,
          targetPort: fiber.targetPort,
        })),
        protectedZones.map((zone) => zone.id),
      );

      const removedPortals = await this.orbitService.reconcileOrbit(
        portals.map((portal) => portal.id),
      );

      this.logger.log(
        `System reset reconciled the host against the database. ` +
        `Removed ${removedWorkers.length} orphan workers, ${removedZones.length} orphan zones, ` +
        `${removedPortals.length} orphan portals. Rebuilt nftables for ${zones.length} zones ` +
        `and ${fibers.length} fibers.`,
      );

      await this.repository.createEvent(
        EventType.SYSTEM_RESET_SUCCESS,
        event.createdBy,
        event.companyId,
      );

      this.logger.log('System reset process completed successfully.');
    } catch (error) {
      await this.repository.createEvent(
        EventType.SYSTEM_RESET_FAILED,
        event.createdBy,
        event.companyId,
      );

      this.logger.error(`System reset failed: ${String(error)}`);

      throw error;
    }
  }

}
