import { EventResource } from "@prisma/client";

import { EventDTO } from "./event-dto";

export type EventResourceDTO = Partial<EventResource> & {
  event?: EventDTO;
};
