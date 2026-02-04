import { BaseEntity } from '@/shared/domain/entities/base.entity';

export class JwtEntity extends BaseEntity {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly type: 'access' | 'refresh',
  ) {
    super();
  }

  toObject() {
    return {
      userId: this.userId,
      email: this.email,
      type: this.type,
    };
  }
}
