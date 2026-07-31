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

  async selfAndDescendants(companyId: string): Promise<string[]> {
    const childrenOf = new Map<string, string[]>();

    for (const link of await this.repository.findParentLinks()) {
      if (!link.parentCompanyId) continue;

      const siblings = childrenOf.get(link.parentCompanyId) ?? [];
      siblings.push(link.id);
      childrenOf.set(link.parentCompanyId, siblings);
    }

    const tree: string[] = [];
    const pending = [companyId];

    while (pending.length) {
      const current = pending.shift()!;
      if (tree.includes(current)) continue;

      tree.push(current);
      pending.push(...(childrenOf.get(current) ?? []));
    }

    return tree;
  }
}
