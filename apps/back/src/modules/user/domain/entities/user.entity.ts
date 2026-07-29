import { UserRole } from '@marppa-cloud/db';
import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface UserOptionalProps {
  id?: string;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserEntity extends PatchableEntity {
  @PrimaryKey()
  public readonly id?: string;

  public readonly role: UserRole;
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
    this.role = options.role ?? UserRole.OWNER;
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
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromObject(obj: Record<string, any>): UserEntity {
    return new UserEntity(obj.email, obj.password, obj.name, obj.companyId, {
      id: obj.id,
      role: obj.role,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    });
  }
}
