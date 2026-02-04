import { BaseEntity } from "@/shared/domain/entities/base.entity";

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
  public readonly id: number | null;
  public readonly notes: string | null;
  public readonly data: Record<string, unknown> | unknown[] | null;
  public readonly retries: number;
  public readonly processedAt: Date | null;
  public readonly failedAt: Date | null;
  public readonly isVisible: boolean;

  constructor(
    public readonly type: string,
    public readonly createdBy: string,
    public readonly companyId: string,
    optionals: EventOptionalProps = {}
  ) {
    super();

    this.id = optionals.id ?? null;
    this.notes = optionals.notes ?? null;
    this.data = optionals.data ?? null;
    this.retries = optionals.retries ?? 0;
    this.processedAt = optionals.processedAt ?? null;
    this.failedAt = optionals.failedAt ?? null;
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