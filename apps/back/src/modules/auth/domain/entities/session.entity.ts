import { PrimaryKey } from '@/shared/domain/decorators/primary-key.decorator';
import { BaseEntity } from '@/shared/domain/entities/base.entity';

interface SessionOptionalProps {
  refreshToken?: string;
  createdAt?: Date;
  expiredAt?: Date;
}

export class SessionEntity extends BaseEntity {
  // @PrimaryKey()
  public readonly refreshToken?: string;

  public readonly createdAt?: Date;
  public readonly expiredAt?: Date;

  constructor(
    public readonly userId: string,
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly platform: string,
    public readonly device: string,
    public readonly browser: string,
    options: SessionOptionalProps = {},
  ) {
    super();

    this.refreshToken = options.refreshToken;
    this.createdAt = options.createdAt;
    this.expiredAt = options.expiredAt;
  }

  toObject() {
    return {
      refreshToken: this.refreshToken,
      userId: this.userId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      platform: this.platform,
      device: this.device,
      browser: this.browser,
      createdAt: this.createdAt,
      expiredAt: this.expiredAt,
    };
  }
}
