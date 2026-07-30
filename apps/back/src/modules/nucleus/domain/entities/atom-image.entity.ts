import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface AtomImageOptionalProps {
  id?: number;
  description?: string;
  digest?: string;
  capabilities?: string[];
  sysctls?: Record<string, string>;
  command?: string[];
  requiredEnvVars?: string[];
  ownerId?: string;
}

export class AtomImageEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly description?: string;
  public readonly digest?: string;
  public readonly capabilities: string[];
  public readonly sysctls?: Record<string, string>;
  public readonly command: string[];
  public readonly requiredEnvVars: string[];
  public readonly ownerId?: string;

  constructor(
    public readonly name: string,
    public readonly registry: string,
    public readonly repository: string,
    public readonly tag: string,
    public readonly architecture: string,
    public readonly defaultSizeId: number,
    optionals: AtomImageOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? undefined;
    this.description = optionals.description ?? undefined;
    this.digest = optionals.digest ?? undefined;
    this.capabilities = optionals.capabilities ?? [];
    this.sysctls = optionals.sysctls ?? undefined;
    this.command = optionals.command ?? [];
    this.requiredEnvVars = optionals.requiredEnvVars ?? [];
    this.ownerId = optionals.ownerId ?? undefined;
  }

  get isPublic(): boolean {
    return this.ownerId == null;
  }

  isVisibleTo(companyId: string): boolean {
    return this.isPublic || this.ownerId === companyId;
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
      defaultSizeId: this.defaultSizeId,
      capabilities: this.capabilities,
      sysctls: this.sysctls,
      command: this.command,
      requiredEnvVars: this.requiredEnvVars,
      ownerId: this.ownerId,
    };
  }

  static fromObject(data: Record<string, any>): AtomImageEntity {
    return new AtomImageEntity(
      data.name,
      data.registry,
      data.repository,
      data.tag,
      data.architecture,
      data.defaultSizeId,
      {
        id: data.id,
        description: data.description,
        digest: data.digest,
        capabilities: data.capabilities,
        sysctls: data.sysctls,
        command: data.command,
        requiredEnvVars: data.requiredEnvVars,
        ownerId: data.ownerId,
      },
    );
  }
}
