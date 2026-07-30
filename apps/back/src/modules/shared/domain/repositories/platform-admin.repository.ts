export const PLATFORM_ADMIN_REPOSITORY_SYMBOL = Symbol(
  'PLATFORM_ADMIN_REPOSITORY',
);

export abstract class PlatformAdminRepository {
  abstract isRootCompany(companyId: string): Promise<boolean>;
}
