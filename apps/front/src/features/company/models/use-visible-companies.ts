import { useCallback, useEffect, useState } from "react";
import { companyApi, VisibleCompanyDto } from "../api/company.api";

export function useVisibleCompanies() {
    const [companies, setCompanies] = useState<VisibleCompanyDto[]>([]);

    useEffect(() => {
        companyApi
            .findVisible()
            .then(setCompanies)
            .catch(() => setCompanies([]));
    }, []);

    const nameOf = useCallback(
        (companyId: string) =>
            companies.find((company) => company.id === companyId)?.name ??
            companyId,
        [companies],
    );

    const hasMoreThanOne = companies.length > 1;

    return { companies, nameOf, hasMoreThanOne };
}
