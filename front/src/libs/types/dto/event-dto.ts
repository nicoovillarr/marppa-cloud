import { Event } from "@prisma/client";

import { CompanyDTO } from "./company-dto";
import { EventResourceDTO } from "./event-resource-dto";

export type EventDTO = Partial<Event> & {
  company?: CompanyDTO;
  resources?: EventResourceDTO[];
};
