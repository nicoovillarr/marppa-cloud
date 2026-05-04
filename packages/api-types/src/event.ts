import { EventTypeKey } from './enums';

// --- Requests ---

export interface CreateEventRequest {
  type: EventTypeKey;
  createdBy?: string;
  companyId?: string;
  notes?: string;
  data?: Record<string, unknown> | unknown[];
}

// --- Responses ---

export interface EventResponse {
  id: number | null;
  type: string;
  notes: string | null;
  data: Record<string, unknown> | unknown[] | null;
  retries: number;
  processedAt: Date | null;
  failedAt: Date | null;
  companyId: string | null;
  createdBy: string;
}

export interface EventResourceResponse {
  id: number | null;
  eventId: number;
  resourceType: string;
  resourceId: string;
}

export interface EventPropertyResponse {
  id: number | null;
  eventId: number;
  key: string;
  value: string;
}

export interface EventWithRelationsResponse extends EventResponse {
  resources: EventResourceResponse[];
  properties: EventPropertyResponse[];
}
