import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface AtomImageOptionalProps {
  id?: number;
  description?: string;
  digest?: string;
  capabilities?: string[];
}

export class AtomImageEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly description?: string;
  public readonly digest?: string;
  public readonly capabilities: string[];

  constructor(
    public readonly name: string,
    public readonly registry: string,
    public readonly repository: string,
    public readonly tag: string,
    public readonly architecture: string,
    optionals: AtomImageOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.description = optionals.description ?? undefined;
    this.digest = optionals.digest ?? undefined;
    this.capabilities = optionals.capabilities ?? [];
  }

  toObject(): Record<string, any> {
    return {
      id: this.id ?? undefined,
      name: this.name,
      description: this.description,
      registry: this.registry,
      repository: this.repository,
      tag: this.tag,
      digest: this.digest,
      architecture: this.architecture,
      capabilities: this.capabilities,
    };
  }

  static fromObject(data: Record<string, any>): AtomImageEntity {
    return new AtomImageEntity(
      data.name,
      data.registry,
      data.repository,
      data.tag,
      data.architecture,
      {
        id: data.id,
        description: data.description,
        digest: data.digest,
        capabilities: data.capabilities,
      },
    );
  }
}
