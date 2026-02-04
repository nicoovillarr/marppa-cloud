import { PatchableEntity } from '@/shared/domain/entities/patchable-base.entity';

interface UserOptionalProps {
  id?: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserEntity extends PatchableEntity {
  public readonly id?: string;
  public readonly companyId?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
    options: UserOptionalProps = {},
  ) {
    super();

    this.id = options.id;
    this.companyId = options.companyId;
    this.createdAt = options.createdAt;
    this.updatedAt = options.updatedAt;
  }

  toObject() {
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

  static fromObject(obj: UserEntity) {
    return new UserEntity(
      obj.email,
      obj.password,
      obj.name,
      {
        id: obj.id,
        companyId: obj.companyId,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
      },
    );
  }
}
