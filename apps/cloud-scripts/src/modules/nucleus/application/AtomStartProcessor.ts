import { EventType, ResourceStatus } from '@marppa-cloud/db';
import type { Prisma } from '@marppa-cloud/db';
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

type AtomWithRelations = Prisma.AtomGetPayload<{
  include: { image: true; envVars: true; node: { include: { zone: true } } };
}>;

const STATES = getEventStates(EventType.ATOM_START);

@EventProcessor(EventType.ATOM_START)
export class AtomStartProcessor implements IEventProcessor {
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
    let atom: AtomWithRelations | null = null;

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
          EventType.ATOM_START_FAILED,
        );
      }

      atom = await this.prisma.atom.findUnique({
        where: {
          id: resourceAtom.resourceId,
          status: { not: ResourceStatus.DELETED },
        },
        include: { image: true, envVars: true, node: { include: { zone: true } } },
      });

      if (!atom) {
        throw new AbortError(
          `Atom not found for event ID: ${event.id}`,
          EventType.ATOM_START_FAILED,
        );
      }

      if (atom.status !== STATES.entry) {
        throw new AbortError(
          `Atom is not in ${STATES.entry} status for event ID: ${event.id}`,
          EventType.ATOM_START_FAILED,
        );
      }

      const node = atom.node;
      if (!node) {
        throw new AbortError(
          `Atom ${atom.id} has no node assigned`,
          EventType.ATOM_START_FAILED,
        );
      }

      if (node.zone.status !== ResourceStatus.ACTIVE) {
        throw new Error(
          `Zone ${node.zoneId} is not ACTIVE for event ID: ${event.id}`,
        );
      }

      const missingEnvVars = atom.image.requiredEnvVars.filter(
        (key) => !atom!.envVars.find((envVar) => envVar.key === key)?.value.trim(),
      );

      if (missingEnvVars.length) {
        throw new AbortError(
          `Atom ${atom.id} is missing required env vars for image "${atom.image.name}": ` +
          `${missingEnvVars.join(', ')}`,
          EventType.ATOM_START_FAILED,
        );
      }

      await updateAtomStatus(STATES.work);

      await this.nucleusService.startAtom(
        atom.id,
        atom.name,
        atom.image,
        {
          zoneId: node.zoneId,
          cidr: node.zone.cidr,
          gateway: node.zone.gateway,
          ipAddress: node.ipAddress,
        },
        Object.fromEntries(atom.envVars.map((envVar) => [envVar.key, envVar.value])),
      );

      await updateAtomStatus(STATES.ok);

      this.wsServer.sendAtomMessage(atom, 'ATOM_STARTED', null);

      const createdEventId = await this.repository.createEvent(
        EventType.ATOM_STARTED,
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
