import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@marppa-cloud/db';

import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';
import {
  PLATFORM_ADMIN_REPOSITORY_SYMBOL,
  PlatformAdminRepository,
} from '@/shared/domain/repositories/platform-admin.repository';

@Injectable()
export class PlatformAdminService {
  constructor(
    @Inject(PLATFORM_ADMIN_REPOSITORY_SYMBOL)
    private readonly repository: PlatformAdminRepository,
  ) { }

  async isPlatformAdmin(): Promise<boolean> {
    const user = getCurrentUser();
    if (!user) return false;

    return this.isPlatformAdminFor(user.companyId, user.role);
  }

  async isPlatformAdminFor(
    companyId: string,
    role: UserRole,
  ): Promise<boolean> {
    if (role !== UserRole.OWNER) return false;

    return this.repository.isRootCompany(companyId);
  }

  async assertPlatformAdmin(): Promise<void> {
    if (!(await this.isPlatformAdmin())) {
      throw new ForbiddenError(
        'This operation is restricted to platform administrators.',
      );
    }
  }
}
