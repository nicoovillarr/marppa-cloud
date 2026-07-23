import { Expose } from 'class-transformer';

export class EventPropertyModel {
  @Expose() id: number | null;
  @Expose() eventId: number;
  @Expose() key: string;
  @Expose() value: string;
}
