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
import { HostPreflightService } from '../infrastructure/services/HostPreflightService';

@EventProcessor(EventType.SYSTEM_RESET)
export class SystemResetProcessor implements IEventProcessor {

  constructor(
    private readonly logger: LoggerService,

    private readonly preflightService: HostPreflightService,

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

      await this.hiveService.forceResetHive();
      await this.meshService.forceResetMesh();
      await this.orbitService.forceResetOrbit();

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
