import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface WorkerFamilyOptionalProps {
  id?: number;
  description?: string;
  ownerId?: string | null;
  deprecatedAt?: Date | null;
}

export class WorkerFamilyEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly description?: string;
  public readonly ownerId: string | null;
  public readonly deprecatedAt: Date | null;

  constructor(
    public readonly name: string,
    public readonly architecture: string,
    optionals: WorkerFamilyOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.description = optionals.description ?? undefined;
    this.ownerId = optionals.ownerId ?? null;
    this.deprecatedAt = optionals.deprecatedAt ?? null;
  }

  get isPublic(): boolean {
    return this.ownerId == null;
  }

  get isDeprecated(): boolean {
    return this.deprecatedAt != null;
  }

  isVisibleTo(companyIds: string[]): boolean {
    return this.isPublic || companyIds.includes(this.ownerId!);
  }

  toObject(): Record<string, any> {
    return {
      id: this.id ?? undefined,
      name: this.name,
      architecture: this.architecture,
      description: this.description,
      ownerId: this.ownerId,
      deprecatedAt: this.deprecatedAt,
    };
  }

  static fromObject(data: Record<string, any>): WorkerFamilyEntity {
    return new WorkerFamilyEntity(data.name, data.architecture, {
      id: data.id,
      description: data.description,
      ownerId: data.ownerId,
      deprecatedAt: data.deprecatedAt,
    });
  }
}
