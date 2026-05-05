import { EventType } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import type { IEventRepository } from '@/event/domain/IEventRepository';
import type { ILogger } from '@/shared/infrastructure/logger/ILogger';
import type { EventPayload } from '@/event/domain/EventPayload';
import type { IMeshService } from '@/mesh/infrastructure/IMeshService';
import type { IOrbitService } from '@/orbit/infrastructure/IOrbitService';
import type { IHiveService } from '@/worker/infrastructure/IHiveService';

import { EventProcessor } from '@/decorators/EventProcessor';

@EventProcessor
export class SystemResetProcessor implements IEventProcessor {
  readonly eventType = EventType.SYSTEM_RESET;

  constructor(
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
    private readonly hiveService: IHiveService,
    private readonly meshService: IMeshService,
    private readonly orbitService: IOrbitService,
  ) {}

  async handle(event: EventPayload): Promise<void> {
    try {
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

