import { fetcher } from "@/core/api/fetcher";

export type VisibleCompanyDto = {
    id: string;
    name: string;
}

export const companyApi = {
    findVisible(): Promise<VisibleCompanyDto[]> {
        return fetcher<VisibleCompanyDto[]>('/company/visible');
    },
}
