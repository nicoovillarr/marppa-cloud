import { EventType } from '@marppa-cloud/db';
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

@EventProcessor(EventType.SYSTEM_RESET_HARD)
export class SystemResetHardProcessor implements IEventProcessor {

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

      this.logger.warn(
        'SYSTEM_RESET_HARD: wiping every host resource and every resource row, ' +
        'regardless of what the database holds.',
      );

      const removedWorkers = await this.hiveService.forceResetHive();
      const { removedZones } = await this.meshService.forceResetMesh();
      const removedPortals = await this.orbitService.forceResetOrbit();

      const purged = await this.purgeResourceRows();

      this.logger.log(
        `Hard reset removed ${removedWorkers.length} workers, ${removedZones.length} zones and ` +
        `${removedPortals.length} portals from the host, and ${purged} resource rows from the database.`,
      );

      await this.repository.createEvent(
        EventType.SYSTEM_RESET_HARD_SUCCESS,
        event.createdBy,
        event.companyId,
      );

      this.logger.log('Hard system reset completed successfully.');
    } catch (error) {
      await this.repository.createEvent(
        EventType.SYSTEM_RESET_HARD_FAILED,
        event.createdBy,
        event.companyId,
      );

      this.logger.error(`Hard system reset failed: ${String(error)}`);

      throw error;
    }
  }

  private async purgeResourceRows(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const deletions = [
        await tx.fiber.deleteMany(),
        await tx.transponder.deleteMany(),
        await tx.portal.deleteMany(),
        await tx.node.deleteMany(),
        await tx.zone.deleteMany(),
        await tx.worker.deleteMany(),
      ];

      return deletions.reduce((total, result) => total + result.count, 0);
    });
  }

}
