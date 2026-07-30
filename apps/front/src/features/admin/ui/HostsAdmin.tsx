"use client";

import { ColumnMapping } from "@/core/ui/Table";
import ReactTimeAgo from "react-timeago";
import { adminApi } from "../api/admin.api";
import { AdminHostCapacityResponseDto } from "../api/admin.api.types";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";

const COLUMNS: ColumnMapping<AdminHostCapacityResponseDto> = {
  hostname: { label: "Hostname", width: "100%", minWidth: "180px" },
  cpuCores: { label: "CPU cores", minWidth: "110px" },
  ramMB: { label: "RAM (MB)", minWidth: "110px" },
  diskGB: { label: "Disk (GB)", minWidth: "110px" },
  reportedAt: {
    label: "Reported",
    minWidth: "160px",
    renderFn: (row: AdminHostCapacityResponseDto) => (
      <ReactTimeAgo date={new Date(row.reportedAt)} />
    ),
  },
};

const FIELDS: AdminField[] = [
  { name: "hostname", label: "Hostname", required: true, omitOnEdit: true },
  { name: "cpuCores", label: "CPU cores", type: "number", required: true },
  { name: "ramMB", label: "RAM (MB)", type: "number", required: true },
  { name: "diskGB", label: "Disk (GB)", type: "number", required: true },
];

export function HostsAdmin() {
  return (
    <AdminCrudSection<AdminHostCapacityResponseDto, string>
      title="Host capacity"
      description="Capacity the scheduler budgets against. Cloud Scripts overwrites these rows when it reports in."
      columns={COLUMNS}
      fields={FIELDS}
      getKey={(row) => row.hostname}
      getLabel={(row) => row.hostname}
      emptyText="No host has reported capacity yet; the configured fallback budget is in use."
      api={{
        list: adminApi.findHosts,
        create: (data) => adminApi.upsertHost(data.hostname, data),
        update: (hostname, data) => adminApi.upsertHost(hostname, data),
        remove: adminApi.deleteHost,
      }}
    />
  );
}
