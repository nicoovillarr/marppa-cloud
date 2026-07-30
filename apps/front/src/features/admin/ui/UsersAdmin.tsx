"use client";

import { ColumnMapping } from "@/core/ui/Table";
import ReactTimeAgo from "react-timeago";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/admin.api";
import {
  AdminCompanyResponseDto,
  AdminUserResponseDto,
} from "../api/admin.api.types";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";

const COLUMNS: ColumnMapping<AdminUserResponseDto> = {
  email: { label: "Email", width: "100%", minWidth: "220px", canCopy: true },
  name: { label: "Name", minWidth: "160px" },
  role: { label: "Role", minWidth: "100px" },
  companyName: { label: "Company", minWidth: "180px" },
  createdAt: {
    label: "Created",
    minWidth: "160px",
    renderFn: (row: AdminUserResponseDto) => (
      <ReactTimeAgo date={new Date(row.createdAt)} />
    ),
  },
};

const ROLE_OPTIONS = [
  { value: "OWNER", displayText: "Owner" },
  { value: "MEMBER", displayText: "Member" },
];

export function UsersAdmin() {
  const [companies, setCompanies] = useState<AdminCompanyResponseDto[]>([]);

  const loadCompanies = useCallback(async () => {
    setCompanies(await adminApi.findCompanies());
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const fields: AdminField[] = [
    { name: "name", label: "Name", required: true },
    { name: "email", label: "Email", required: true },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      omitOnEdit: true,
    },
    {
      name: "password",
      label: "New password",
      type: "password",
      omitOnCreate: true,
      tooltip: "Leave empty to keep the current one",
    },
    {
      name: "companyId",
      label: "Company",
      type: "select",
      required: true,
      options: companies.map((company) => ({
        value: company.id,
        displayText: company.name,
      })),
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      options: ROLE_OPTIONS,
    },
  ];

  return (
    <AdminCrudSection<AdminUserResponseDto, string>
      title="User"
      description="Accounts across every company."
      columns={COLUMNS}
      fields={fields}
      getKey={(row) => row.id}
      getLabel={(row) => row.email}
      confirmRemoveByName
      removeWarning="Deleting a user is permanent and drops all of their sessions."
      onChanged={loadCompanies}
      api={{
        list: (page, pageSize) => adminApi.findUsers({ page, pageSize }),
        create: adminApi.createUser,
        update: adminApi.updateUser,
        remove: adminApi.deleteUser,
      }}
    />
  );
}
