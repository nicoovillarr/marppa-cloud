export const COMPANY_HIERARCHY_REPOSITORY_SYMBOL = Symbol(
  'COMPANY_HIERARCHY_REPOSITORY',
);

export interface CompanyParentLink {
  id: string;
  parentCompanyId: string | null;
}

export abstract class CompanyHierarchyRepository {
  abstract findParentLinks(): Promise<CompanyParentLink[]>;
}
