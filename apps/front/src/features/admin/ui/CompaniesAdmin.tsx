"use client";

import { ColumnMapping } from "@/core/ui/Table";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/admin.api";
import { AdminCompanyResponseDto } from "../api/admin.api.types";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";

const COLUMNS: ColumnMapping<AdminCompanyResponseDto> = {
  id: { label: "#", minWidth: "120px", canCopy: true },
  name: { label: "Name", width: "100%", minWidth: "180px" },
  alias: { label: "Alias", minWidth: "100px" },
  parentCompanyId: {
    label: "Parent",
    minWidth: "140px",
    renderFn: (row: AdminCompanyResponseDto) =>
      row.isRoot ? "root" : row.parentCompanyId ?? "—",
  },
  counts: {
    label: "Users / resources",
    minWidth: "160px",
    renderFn: (row: AdminCompanyResponseDto) => {
      const { users, workers, atoms, zones, portals } = row.counts;
      return `${users} / ${workers + atoms + zones + portals}`;
    },
  },
};

export function CompaniesAdmin() {
  const [companies, setCompanies] = useState<AdminCompanyResponseDto[]>([]);

  const loadCompanies = useCallback(async () => {
    setCompanies(await adminApi.findCompanies());
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const fields: AdminField[] = [
    { name: "name", label: "Name", required: true },
    { name: "alias", label: "Alias" },
    { name: "description", label: "Description" },
    {
      name: "parentCompanyId",
      label: "Parent company",
      type: "select",
      omitOnCreate: true,
      tooltip: "New companies hang off the root company",
      options: companies.map((company) => ({
        value: company.id,
        displayText: company.name,
      })),
    },
  ];

  return (
    <AdminCrudSection<AdminCompanyResponseDto, string>
      title="Company"
      description="Tenants of the platform. The root company owns platform administration."
      columns={COLUMNS}
      fields={fields}
      getKey={(row) => row.id}
      getLabel={(row) => row.name}
      confirmRemoveByName
      removeWarning="Deleting a company is permanent. It must have no users and no resources."
      canRemove={(row) => !row.isRoot}
      onChanged={loadCompanies}
      api={{
        list: () => adminApi.findCompanies(),
        create: adminApi.createCompany,
        update: adminApi.updateCompany,
        remove: adminApi.deleteCompany,
      }}
    />
  );
}
