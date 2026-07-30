import { UserRole } from '@marppa-cloud/db';

export class AdminUserModel {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRole,
    public readonly companyId: string,
    public readonly companyName: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) { }
}
