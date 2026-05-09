import { EventType } from '@marppa-cloud/db';
import type { IEventProcessor } from '@/event/domain/IEventProcessor';
import { IEventRepository } from '@/event/domain/IEventRepository';
import { ILogger, ILOGGER_TOKEN } from '@/shared/infrastructure/logger/ILogger';
import type { EventPayload } from '@/event/domain/EventPayload';
import { IMeshService } from '@/mesh/infrastructure/IMeshService';
import { IOrbitService } from '@/orbit/infrastructure/IOrbitService';
import { IHiveService } from '@/worker/infrastructure/IHiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';

@Injectable()
@EventProcessor(EventType.SYSTEM_RESET)
export class SystemResetProcessor implements IEventProcessor {

  constructor(
    private readonly repository: IEventRepository,
    private readonly hiveService: IHiveService,
    private readonly meshService: IMeshService,
    private readonly orbitService: IOrbitService,
    
    @Inject(ILOGGER_TOKEN)
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

