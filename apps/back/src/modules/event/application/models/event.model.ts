import { Expose } from 'class-transformer';

export class EventModel {
  @Expose() id: number | null;
  @Expose() type: string;
  @Expose() notes: string | null;
  @Expose() data: Record<string, unknown> | unknown[] | null;
  @Expose() retries: number;
  @Expose() processedAt: Date | null;
  @Expose() failedAt: Date | null;
  @Expose() companyId: string | null;
  @Expose() createdBy: string;
}
