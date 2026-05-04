import { EventType } from '@marppa-cloud/db';
import type { IEventProcessor } from '../../event/domain/IEventProcessor';
import type { IEventRepository } from '../../event/domain/IEventRepository';
import type { ILogger } from '../../shared/infrastructure/logger/ILogger';
import type { EventPayload } from '../../event/domain/EventPayload';
import { MeshService } from '../../mesh/infrastructure/MeshService';
import { OrbitService } from '../../orbit/infrastructure/OrbitService';
import { HiveService } from '../../worker/infrastructure/HiveService';

export class SystemResetProcessor implements IEventProcessor {
  readonly eventType = EventType.SYSTEM_RESET;
  
  private readonly hiveService = new HiveService();
  private readonly meshService = new MeshService();
  private readonly orbitService = new OrbitService();

  constructor(
    private readonly repository: IEventRepository,
    private readonly logger: ILogger,
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

