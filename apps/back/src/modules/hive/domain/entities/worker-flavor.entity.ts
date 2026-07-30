import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface WorkerFlavorOptionalProps {
  id?: number;
  version?: number;
  pricePerHourCents?: number;
  deprecatedAt?: Date | null;
}

export class WorkerFlavorEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly version: number;
  public readonly pricePerHourCents: number;
  public readonly deprecatedAt: Date | null;

  constructor(
    public readonly name: string,
    public readonly cpuCores: number,
    public readonly ramMB: number,
    public readonly familyId: number,
    optionals: WorkerFlavorOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.version = optionals.version ?? 1;
    this.pricePerHourCents = optionals.pricePerHourCents ?? 0;
    this.deprecatedAt = optionals.deprecatedAt ?? null;
  }

  get isDeprecated(): boolean {
    return this.deprecatedAt != null;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id ?? undefined,
      name: this.name,
      version: this.version,
      cpuCores: this.cpuCores,
      ramMB: this.ramMB,
      pricePerHourCents: this.pricePerHourCents,
      deprecatedAt: this.deprecatedAt,
      familyId: this.familyId,
    };
  }

  static fromObject(data: Record<string, any>): WorkerFlavorEntity {
    return new WorkerFlavorEntity(
      data.name,
      data.cpuCores,
      data.ramMB,
      data.familyId,
      {
        id: data.id,
        version: data.version,
        pricePerHourCents: data.pricePerHourCents,
        deprecatedAt: data.deprecatedAt,
      },
    );
  }
}
