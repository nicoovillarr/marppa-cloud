import { EventType } from '@marppa-cloud/db';

export const SYSTEM_SCOPED_EVENTS: EventType[] = [
  EventType.SYSTEM_RESET,
  EventType.SYSTEM_RESET_HARD,
];

export const expectedPrimaryResources = (type: EventType): number =>
  SYSTEM_SCOPED_EVENTS.includes(type) ? 0 : 1;
