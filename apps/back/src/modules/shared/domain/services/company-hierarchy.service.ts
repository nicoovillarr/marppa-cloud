import { Inject, Injectable } from '@nestjs/common';

import {
  COMPANY_HIERARCHY_REPOSITORY_SYMBOL,
  CompanyHierarchyRepository,
} from '../repositories/company-hierarchy.repository';

@Injectable()
export class CompanyHierarchyService {
  constructor(
    @Inject(COMPANY_HIERARCHY_REPOSITORY_SYMBOL)
    private readonly repository: CompanyHierarchyRepository,
  ) { }

  async selfAndAncestors(companyId: string): Promise<string[]> {
    const parentOf = new Map(
      (await this.repository.findParentLinks()).map((link) => [
        link.id,
        link.parentCompanyId,
      ]),
    );

    const chain: string[] = [];
    let cursor: string | null | undefined = companyId;

    while (cursor && !chain.includes(cursor)) {
      chain.push(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }

    return chain;
  }
}
