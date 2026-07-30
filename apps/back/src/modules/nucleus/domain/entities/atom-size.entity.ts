import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface AtomSizeOptionalProps {
  id?: number;
  version?: number;
  pricePerHourCents?: number;
  deprecatedAt?: Date | null;
}

export class AtomSizeEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly version: number;
  public readonly pricePerHourCents: number;
  public readonly deprecatedAt: Date | null;

  constructor(
    public readonly name: string,
    public readonly cpuCores: number,
    public readonly ramMB: number,
    optionals: AtomSizeOptionalProps = {},
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
    };
  }

  static fromObject(data: Record<string, any>): AtomSizeEntity {
    return new AtomSizeEntity(data.name, data.cpuCores, data.ramMB, {
      id: data.id,
      version: data.version,
      pricePerHourCents: data.pricePerHourCents,
      deprecatedAt: data.deprecatedAt,
    });
  }
}
