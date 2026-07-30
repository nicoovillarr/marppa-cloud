import { CanActivate, Injectable } from '@nestjs/common';

import { PlatformAdminService } from '@/shared/domain/services/platform-admin.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly platformAdminService: PlatformAdminService) { }

  async canActivate(): Promise<boolean> {
    await this.platformAdminService.assertPlatformAdmin();
    return true;
  }
}
