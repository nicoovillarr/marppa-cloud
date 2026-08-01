import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { Prisma } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';

import { EventProcessor } from '@/decorators/EventProcessor';
import { AbortError } from '@/event/domain/errors/AbortError';
import {
  EVENT_REPOSITORY_TOKEN,
  EventRepository,
} from '@/event/domain/repositories/EventRepository';
import { NUCLEUS_SERVICE_TOKEN, NucleusService } from '../domain/services/NucleusService';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { Inject } from '@/decorators/Inject';
import { getEventStates } from '@/shared/domain/EventStateMachine';

type AtomWithImage = Prisma.AtomGetPayload<{ include: { image: true } }>;

const STATES = getEventStates(EventType.ATOM_CREATE);

@EventProcessor(EventType.ATOM_CREATE)
export class AtomCreateProcessor implements IEventProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,

    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(NUCLEUS_SERVICE_TOKEN)
    private readonly nucleusService: NucleusService,
  ) { }

  public async handle(event: EventPayload): Promise<void> {
    let atom: AtomWithImage | null = null;

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
          EventType.ATOM_CREATE_FAILED,
        );
      }

      atom = await this.prisma.atom.findUnique({
        where: {
          id: resourceAtom.resourceId,
          status: { not: ResourceStatus.DELETED },
        },
        include: { image: true },
      });

      if (!atom) {
        throw new AbortError(
          `Atom not found for event ID: ${event.id}`,
          EventType.ATOM_CREATE_FAILED,
        );
      }

      if (atom.status !== STATES.entry) {
        throw new AbortError(
          `Atom is not in ${STATES.entry} status for event ID: ${event.id}`,
          EventType.ATOM_CREATE_FAILED,
        );
      }

      await updateAtomStatus(STATES.work);

      // The image comes from the AtomImage row the FK points at, never from the
      // event payload: an atom can only ever pull an approved image. The tag is
      // snapshotted on the Atom so the same catalog entry can serve variants.
      if (!(await this.nucleusService.ensureAtomImageExists({
        ...atom.image,
        tag: atom.tag,
      }))) {
        throw new AbortError(
          `Could not pull atom image for event ID: ${event.id}.`,
          EventType.ATOM_CREATE_FAILED,
        );
      }

      await updateAtomStatus(STATES.ok);

      const { id, name, status, ownerId } = atom;
      this.wsServer.sendAtomMessage(atom, 'CREATED', { id, name, status, ownerId });

      const createdEventId = await this.repository.createEvent(
        EventType.ATOM_CREATED,
        event.createdBy,
        event.companyId,
      );
      await this.repository.addEventResource(createdEventId, 'Event', String(event.id));
      await this.repository.addEventResource(createdEventId, 'Atom', atom.id);
    } catch (error) {
      if (error instanceof AbortError) {
        if (atom?.status === STATES.entry) {
          await updateAtomStatus(STATES.fail);
        }
        throw error;
      }

      if (atom) {
        await updateAtomStatus(event.retries >= 4 ? STATES.fail : STATES.entry);
      }
      throw error;
    }
  }
}
