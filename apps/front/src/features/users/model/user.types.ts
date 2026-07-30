export type UserRole = "OWNER" | "MEMBER";

export class User {
    id: string;
    email: string;
    name: string;
    companyId: string;
    role: UserRole;
    isPlatformAdmin: boolean;
}
