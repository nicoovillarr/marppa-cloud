import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';
import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PortalType } from '../enum/portal-type.enum';

interface DnsApiKeyOptionalProps {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export class DnsApiKeyEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: number;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly updatedBy?: string;

  constructor(
    public readonly name: string,
    public readonly type: PortalType,
    public readonly apiKey: string,
    public readonly createdBy: string,
    public readonly ownerId: string,
    optionals: DnsApiKeyOptionalProps = {},
  ) {
    super();

    this.id = optionals.id;
    this.createdAt = optionals.createdAt;
    this.updatedAt = optionals.updatedAt;
    this.updatedBy = optionals.updatedBy;
  }

  public toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      apiKey: this.apiKey,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
      ownerId: this.ownerId,
    };
  }

  public static fromObject(object: Record<string, any>): DnsApiKeyEntity {
    return new DnsApiKeyEntity(
      object.name,
      object.type,
      object.apiKey,
      object.createdBy,
      object.ownerId,
      {
        id: object.id,
        createdAt: object.createdAt,
        updatedAt: object.updatedAt,
        updatedBy: object.updatedBy,
      },
    );
  }
}
