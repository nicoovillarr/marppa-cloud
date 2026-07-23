import {
  EVENT_STATE_MACHINE,
  EventTypeKey,
  type EventStateTransition,
} from '@marppa-cloud/api-types';
import { EventType, ResourceStatus } from '@marppa-cloud/db';

/**
 * Canonical states a processor must observe/apply for a command event.
 * Mirrors {@link EventStateTransition} but in terms of the db `ResourceStatus`.
 */
export interface ProcessorStates {
  entry: ResourceStatus;
  work: ResourceStatus;
  ok: ResourceStatus;
  fail: ResourceStatus;
}

/**
 * Adapter over the shared {@link EVENT_STATE_MACHINE} (defined in api-types).
 *
 * The api-types `EventTypeKey`/`ResourceStatus` and the db (Prisma)
 * `EventType`/`ResourceStatus` are two enums generated from the same source of
 * truth and share identical string values, so the casts below are safe and are
 * kept isolated to this single boundary — processors get clean db enums.
 */
export function getEventStates(type: EventType): ProcessorStates {
  const transition = EVENT_STATE_MACHINE[type as unknown as EventTypeKey];
  if (!transition) {
    throw new Error(`No state machine transition defined for event type: ${type}`);
  }
  return {
    entry: transition.entry as unknown as ResourceStatus,
    work: transition.work as unknown as ResourceStatus,
    ok: transition.ok as unknown as ResourceStatus,
    fail: transition.fail as unknown as ResourceStatus,
  };
}
