import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { Atom } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { AbortError } from '@/event/domain/errors/AbortError';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '@/event/domain/repositories/EventRepository';
import { NUCLEUS_SERVICE_TOKEN, NucleusService } from '../domain/services/NucleusService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

const STATES = getEventStates(EventType.ATOM_TERMINATE);

@EventProcessor(EventType.ATOM_TERMINATE)
export class AtomTerminateProcessor implements IEventProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(NUCLEUS_SERVICE_TOKEN)
    private readonly nucleusService: NucleusService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let atom: Atom | null = null;

    const updateAtomStatus = async (status: ResourceStatus) => {
      await this.prisma.atom.update({
        where: { id: atom!.id },
        data: { status, updatedBy: event.createdBy },
      });
      this.wsServer.sendAtomMessage(atom!, 'UPDATED', { status });
    };

    try {
      const resourceAtom = event.resources.find((r) => r.resourceType === 'Atom');
      if (!resourceAtom) {
        throw new AbortError(
          `No atom resource found for event ID: ${event.id}`,
          EventType.ATOM_TERMINATE_FAILED,
        );
      }

      atom = await this.prisma.atom.findUnique({
        where: {
          id: resourceAtom.resourceId,
          status: { not: ResourceStatus.DELETED },
        },
      });

      if (!atom) {
        throw new AbortError(
          `Atom not found for event ID: ${event.id}`,
          EventType.ATOM_TERMINATE_FAILED,
        );
      }

      if (atom.status !== STATES.entry) {
        throw new AbortError(
          `Atom is not in ${STATES.entry} status for event ID: ${event.id}`,
          EventType.ATOM_TERMINATE_FAILED,
        );
      }

      await updateAtomStatus(STATES.work);

      await this.nucleusService.stopAtom(atom.id);

      await updateAtomStatus(STATES.ok);

      this.wsServer.sendAtomMessage(atom, 'ATOM_TERMINATED', null);

      const createdEventId = await this.repository.createEvent(
        EventType.ATOM_TERMINATED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Atom', atom.id);
    } catch (error) {
      if (error instanceof AbortError) throw error;

      this.logger.error(`Error processing event ID ${event.id}: ${String(error)}`);

      if (atom) {
        await updateAtomStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}
