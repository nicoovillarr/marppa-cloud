import { Expose } from "class-transformer";

export class EventResourceModel {
  @Expose() id: number | null;
  @Expose() eventId: number;
  @Expose() resourceType: string;
  @Expose() resourceId: string;
}
