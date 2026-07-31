import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import {
  CompanyHierarchyRepository,
  CompanyParentLink,
} from '@/shared/domain/repositories/company-hierarchy.repository';

@Injectable()
export class CompanyHierarchyPrismaRepository
  implements CompanyHierarchyRepository {
  constructor(private readonly prisma: PrismaService) { }

  findParentLinks(): Promise<CompanyParentLink[]> {
    return this.prisma.company.findMany({
      select: { id: true, parentCompanyId: true },
    });
  }
}
