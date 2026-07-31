"use client";

import { ColumnMapping } from "@/core/ui/Table";
import ReactTimeAgo from "react-timeago";
import { adminApi } from "../api/admin.api";
import { AdminHostCapacityResponseDto } from "../api/admin.api.types";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";
import { Callout } from "@/core/ui/Callout";
import { LuTriangleAlert } from "react-icons/lu";

function budget(reportedValue: number, override: number | null): string {
  if (override == null) return String(reportedValue);
  return `${override} / ${reportedValue}`;
}

const COLUMNS: ColumnMapping<AdminHostCapacityResponseDto> = {
  hostname: { label: "Hostname", width: "100%", minWidth: "180px" },
  cpuCores: {
    label: "vCPU (budget / reported)",
    minWidth: "190px",
    renderFn: (row: AdminHostCapacityResponseDto) =>
      budget(row.cpuCores, row.cpuCoresOverride),
  },
  ramMB: {
    label: "RAM MB (budget / reported)",
    minWidth: "200px",
    renderFn: (row: AdminHostCapacityResponseDto) =>
      budget(row.ramMB, row.ramMBOverride),
  },
  diskGB: {
    label: "Disk GB (budget / reported)",
    minWidth: "200px",
    renderFn: (row: AdminHostCapacityResponseDto) =>
      budget(row.diskGB, row.diskGBOverride),
  },
  reportedAt: {
    label: "Reported",
    minWidth: "160px",
    renderFn: (row: AdminHostCapacityResponseDto) => (
      <ReactTimeAgo date={new Date(row.reportedAt)} />
    ),
  },
};

const FIELDS: AdminField[] = [
  {
    name: "cpuCoresOverride",
    label: "vCPU budget",
    type: "number",
    tooltip: "Leave empty to use what the host reported",
  },
  {
    name: "ramMBOverride",
    label: "RAM budget (MB)",
    type: "number",
    tooltip: "Leave empty to use what the host reported",
  },
  {
    name: "diskGBOverride",
    label: "Disk budget (GB)",
    type: "number",
    tooltip: "Leave empty to use what the host reported",
  },
];

export function HostsAdmin() {
  return (
    <div className="flex flex-col gap-4">
      <Callout
        icon={<LuTriangleAlert />}
        text="Rows are created and refreshed by the host preflight, which runs on every cloud-scripts start and on every SYSTEM_RESET. Only the budget columns are yours: the preflight never touches them, and the scheduler adds up the budget of every row."
      />

      <AdminCrudSection<AdminHostCapacityResponseDto, string>
        title="Host capacity"
        description="Reserve headroom by budgeting below what a host reported."
        columns={COLUMNS}
        fields={FIELDS}
        getKey={(row) => row.hostname}
        getLabel={(row) => row.hostname}
        emptyText="No host has reported capacity yet; the configured fallback budget is in use."
        removeWarning="The row comes back on the next preflight, but the budget set here is lost."
        api={{
          list: () => adminApi.findHosts(),
          update: (hostname, data) =>
            adminApi.updateHostOverride(hostname, data),
          remove: adminApi.deleteHost,
        }}
      />
    </div>
  );
}
