"use client";

import { ColumnMapping } from "@/core/ui/Table";
import ReactTimeAgo from "react-timeago";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/admin.api";
import {
  AdminHostCapacityResponseDto,
  AdminHostMetricsResponseDto,
  AdminHostUsageResponseDto,
  StorageMedia,
} from "../api/admin.api.types";
import { AdminCrudSection } from "./AdminCrudSection";
import { AdminField } from "./AdminCrudForm";
import { HostUsageSummary } from "./HostUsageSummary";
import { HostMetricsPanel } from "./HostMetricsPanel";
import { Callout } from "@/core/ui/Callout";
import { LuTriangleAlert } from "react-icons/lu";

function budget(reportedValue: number, override: number | null): string {
  if (override == null) return String(reportedValue);
  return `${override} / ${reportedValue}`;
}

const METRICS_REFRESH_MS = 30_000;

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <header>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-sm text-ink-muted">{description}</p>
    </header>
  );
}

function withMedia(value: string, media: StorageMedia | null): string {
  return media == null ? value : `${value} (${media})`;
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
  workerDiskGB: {
    label: "Worker disks GB (budget / reported)",
    minWidth: "240px",
    renderFn: (row: AdminHostCapacityResponseDto) =>
      withMedia(budget(row.workerDiskGB, row.workerDiskGBOverride), row.workerDiskMedia),
  },
  atomVolumeGB: {
    label: "Atom volumes GB (budget / reported)",
    minWidth: "240px",
    renderFn: (row: AdminHostCapacityResponseDto) =>
      withMedia(budget(row.atomVolumeGB, row.atomVolumeGBOverride), row.atomVolumeMedia),
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
    name: "workerDiskGBOverride",
    label: "Worker disk budget (GB)",
    type: "number",
    tooltip: "Leave empty to use what the host reported",
  },
  {
    name: "atomVolumeGBOverride",
    label: "Atom volume budget (GB)",
    type: "number",
    tooltip: "Leave empty to use what the host reported",
  },
];

export function HostsAdmin() {
  const [usage, setUsage] = useState<AdminHostUsageResponseDto | null>(null);
  const [metrics, setMetrics] = useState<AdminHostMetricsResponseDto[] | null>(null);

  const loadUsage = useCallback(() => {
    adminApi
      .findHostUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  const loadMetrics = useCallback(() => {
    adminApi
      .findHostMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  useEffect(() => {
    loadUsage();
    loadMetrics();

    const timer = setInterval(() => {
      loadUsage();
      loadMetrics();
    }, METRICS_REFRESH_MS);

    return () => clearInterval(timer);
  }, [loadUsage, loadMetrics]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        title="Allocation"
        description="What the platform has committed to its resources, measured against the budget the scheduler enforces."
      />
      {usage && <HostUsageSummary usage={usage} />}

      <SectionHeading
        title="Live metrics"
        description="What each host is actually using right now, including anything running outside the platform. Refreshed every 30 seconds."
      />
      {metrics && <HostMetricsPanel hosts={metrics} />}

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
        onChanged={loadUsage}
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
