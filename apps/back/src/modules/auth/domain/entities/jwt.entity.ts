import { UserRole } from '@marppa-cloud/db';
import { BaseEntity } from '@/shared/domain/entities/base.entity';

export class JwtEntity extends BaseEntity {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly companyId: string,
    public readonly type: 'access' | 'refresh',
    public readonly role: UserRole,
  ) {
    super();
  }

  toObject() {
    return {
      userId: this.userId,
      email: this.email,
      companyId: this.companyId,
      type: this.type,
      role: this.role,
    };
  }
}
