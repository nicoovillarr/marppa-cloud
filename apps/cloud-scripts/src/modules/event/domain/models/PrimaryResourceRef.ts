export interface PrimaryResourceRef {
  type: string;
  id: string;
}

export interface EventJobData {
  eventId: number;
  primary?: PrimaryResourceRef;
}
