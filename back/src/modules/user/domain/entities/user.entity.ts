import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface UserOptionalProps {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
    public readonly companyId: string,
    options: UserOptionalProps = {},
  ) {
    super();

    this.id = options.id;
    this.createdAt = options.createdAt;
    this.updatedAt = options.updatedAt;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      password: this.password,
      name: this.name,
      companyId: this.companyId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromObject(obj: Record<string, any>): UserEntity {
    return new UserEntity(obj.email, obj.password, obj.name, obj.companyId, {
      id: obj.id,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    });
  }
}
