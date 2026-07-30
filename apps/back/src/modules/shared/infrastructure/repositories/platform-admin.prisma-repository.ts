import { Injectable } from '@nestjs/common';

import { PlatformAdminRepository } from '@/shared/domain/repositories/platform-admin.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';

@Injectable()
export class PlatformAdminPrismaRepository implements PlatformAdminRepository {
  constructor(private readonly prisma: PrismaService) { }

  async isRootCompany(companyId: string): Promise<boolean> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { parentCompanyId: true },
    });

    return company != null && company.parentCompanyId == null;
  }
}
