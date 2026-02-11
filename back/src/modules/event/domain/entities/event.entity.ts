import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { BaseEntity } from "@/shared/domain/entities/base.entity";
import { EventTypeKey } from "../enums/event-type-key.enum";

interface EventOptionalProps {
  id?: number,
  notes?: string,
  data?: Record<string, unknown> | unknown[],
  createdAt?: Date,
  createdBy?: string,
  retries?: number,
  processedAt?: Date,
  failedAt?: Date,
  isVisible?: boolean,
}

export class EventEntity extends BaseEntity {

  @PrimaryKey()
  public readonly id?: number;
  
  public readonly notes?: string;
  public readonly data?: Record<string, unknown> | unknown[];
  public readonly retries?: number;
  public readonly processedAt?: Date;
  public readonly failedAt?: Date;
  public readonly isVisible?: boolean;

  constructor(
    public readonly type: EventTypeKey,
    public readonly createdBy: string,
    public readonly companyId: string,
    optionals: EventOptionalProps = {}
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.notes = optionals.notes ?? undefined;
    this.data = optionals.data ?? undefined;
    this.retries = optionals.retries ?? 0;
    this.processedAt = optionals.processedAt ?? undefined;
    this.failedAt = optionals.failedAt ?? undefined;
    this.isVisible = optionals.isVisible ?? true;
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      notes: this.notes,
      data: this.data,
      retries: this.retries,
      processedAt: this.processedAt,
      failedAt: this.failedAt,
      companyId: this.companyId,
      createdBy: this.createdBy,
    }
  }
}