"use client";

import { Card } from "@/core/ui/Card";
import ReactTimeAgo from "react-timeago";
import { LuActivity, LuTriangleAlert } from "react-icons/lu";
import {
  AdminHostMetricsResponseDto,
  FilesystemMetricsDto,
  StorageMedia,
} from "../api/admin.api.types";

const NEAR_FULL_RATIO = 0.9;

const MEDIA_LABEL: Record<StorageMedia, string> = {
  NVME: "NVMe",
  SSD: "SSD",
  HDD: "HDD",
};

interface Segment {
  label: string;
  value: number;
  className: string;
}

function share(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(value / total, 0), 1);
}

function StackedBar({ label, total, segments }: { label: string; total: number; segments: Segment[] }) {
  return (
    <div
      className="flex h-2 overflow-hidden rounded-full bg-surface-sunken"
      role="img"
      aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")} of ${total}`}
    >
      {segments.map((segment) => (
        <div
          key={segment.label}
          className={segment.className}
          style={{ width: `${share(segment.value, total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; value: string; swatch: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.swatch}`} />
          {item.label}
          <span className="font-mono tabular-nums text-ink">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

function gib(megabytes: number): string {
  return `${(megabytes / 1024).toFixed(1)} GB`;
}

function bytes(value: number): string {
  const gigabytes = value / 1024 ** 3;
  if (gigabytes >= 1) return `${gigabytes.toFixed(gigabytes >= 100 ? 0 : 1)} GB`;
  return `${(value / 1024 ** 2).toFixed(0)} MB`;
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function CpuMetrics({ cpu }: { cpu: AdminHostMetricsResponseDto["cpu"] }) {
  const split = cpu.platformPercent != null && cpu.externalPercent != null;

  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between">
        <h4 className="font-semibold">CPU</h4>
        <p className="font-mono text-sm tabular-nums text-ink-muted">
          {percent(cpu.usedPercent)} of {cpu.cores} cores · load {cpu.loadAverage1m.toFixed(2)}
        </p>
      </header>
      <StackedBar
        label="CPU"
        total={100}
        segments={
          split
            ? [
              { label: "Platform", value: cpu.platformPercent!, className: "bg-accent" },
              { label: "Outside the platform", value: cpu.externalPercent!, className: "bg-status-progress" },
            ]
            : [{ label: "Used", value: cpu.usedPercent, className: "bg-accent" }]
        }
      />
      {split ? (
        <Legend
          items={[
            { label: "Platform", value: percent(cpu.platformPercent!), swatch: "bg-accent" },
            { label: "Outside the platform", value: percent(cpu.externalPercent!), swatch: "bg-status-progress" },
          ]}
        />
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Platform split unavailable: the host cgroups could not be read.</p>
      )}
    </section>
  );
}

function MemoryMetrics({ memory }: { memory: AdminHostMetricsResponseDto["memory"] }) {
  const split = memory.platformMB != null && memory.externalMB != null;

  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between">
        <h4 className="font-semibold">Memory</h4>
        <p className="font-mono text-sm tabular-nums text-ink-muted">
          {gib(memory.usedMB)} / {gib(memory.totalMB)}
        </p>
      </header>
      <StackedBar
        label="Memory"
        total={memory.totalMB}
        segments={
          split
            ? [
              { label: "Platform", value: Math.min(memory.platformMB!, memory.usedMB), className: "bg-accent" },
              { label: "Outside the platform", value: memory.externalMB!, className: "bg-status-progress" },
            ]
            : [{ label: "Used", value: memory.usedMB, className: "bg-accent" }]
        }
      />
      {split ? (
        <Legend
          items={[
            { label: "Platform", value: gib(Math.min(memory.platformMB!, memory.usedMB)), swatch: "bg-accent" },
            { label: "Outside the platform", value: gib(memory.externalMB!), swatch: "bg-status-progress" },
            { label: "Free", value: gib(memory.totalMB - memory.usedMB), swatch: "bg-surface-sunken" },
          ]}
        />
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Platform split unavailable: the host cgroups could not be read.</p>
      )}
    </section>
  );
}

function FilesystemRow({ filesystem }: { filesystem: FilesystemMetricsDto }) {
  const ratio = share(filesystem.usedBytes, filesystem.sizeBytes);
  const nearFull = ratio >= NEAR_FULL_RATIO;

  return (
    <li className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate font-mono text-sm">
          {filesystem.mountPoint}
          {filesystem.media && (
            <span className="rounded bg-accent-tint px-1.5 py-0.5 font-sans text-xs text-accent-ink">
              {MEDIA_LABEL[filesystem.media]}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-ink-faint">{filesystem.device}</p>
      </div>
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={nearFull ? "h-full bg-status-danger" : "h-full bg-accent"}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <p className={`mt-1 font-mono text-xs tabular-nums ${nearFull ? "text-status-danger" : "text-ink-muted"}`}>
          {bytes(filesystem.usedBytes)} / {bytes(filesystem.sizeBytes)} · {(ratio * 100).toFixed(0)}%
        </p>
      </div>
    </li>
  );
}

function StorageMetrics({ metrics }: { metrics: AdminHostMetricsResponseDto }) {
  return (
    <section>
      <h4 className="mb-1 font-semibold">Storage</h4>
      <ul className="divide-y divide-border">
        {metrics.filesystems.map((filesystem) => (
          <FilesystemRow key={filesystem.device} filesystem={filesystem} />
        ))}
        {metrics.atomVolumePool && (
          <FilesystemRow
            filesystem={{
              mountPoint: "Atom volume pool",
              device: "Logical volumes carved per atom volume",
              fsType: "lvm",
              sizeBytes: metrics.atomVolumePool.sizeGB * 1024 ** 3,
              usedBytes: metrics.atomVolumePool.allocatedGB * 1024 ** 3,
              media: null,
            }}
          />
        )}
      </ul>
    </section>
  );
}

function headroomWarnings(metrics: AdminHostMetricsResponseDto): string[] {
  const warnings: string[] = [];
  const { cpuCores, memoryMB } = metrics.headroom;

  if (memoryMB?.exceeded) {
    warnings.push(
      `Workloads outside the platform use ${gib(memoryMB.external)} of memory, but only ${gib(memoryMB.reserved)} is held back from the RAM budget.`,
    );
  }

  if (cpuCores?.exceeded) {
    warnings.push(
      `Workloads outside the platform use ${cpuCores.external.toFixed(1)} cores, but only ${cpuCores.reserved} are held back from the vCPU budget.`,
    );
  }

  return warnings;
}

function HostMetricsCard({ metrics }: { metrics: AdminHostMetricsResponseDto }) {
  const warnings = headroomWarnings(metrics);

  return (
    <Card>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LuActivity className="h-5 w-5 text-accent" />
          <h3 className="font-display text-xl font-semibold">{metrics.hostname}</h3>
        </div>
        <p className={`text-sm ${metrics.stale ? "text-status-danger" : "text-ink-muted"}`}>
          {metrics.stale ? "No recent sample, last one " : "Sampled "}
          <ReactTimeAgo date={new Date(metrics.sampledAt)} />
        </p>
      </header>

      {warnings.length > 0 && (
        <div className="mb-4 flex gap-3 rounded-md border border-status-danger/30 bg-status-danger-tint p-3 text-status-danger">
          <LuTriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <p className="mt-1">Lower the budget in the table below so the scheduler stops counting on that capacity.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <CpuMetrics cpu={metrics.cpu} />
          <MemoryMetrics memory={metrics.memory} />
        </div>
        <StorageMetrics metrics={metrics} />
      </div>
    </Card>
  );
}

export function HostMetricsPanel({ hosts }: { hosts: AdminHostMetricsResponseDto[] }) {
  if (hosts.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">
          No host has sent live metrics yet. cloud-scripts samples the host every minute once it is running.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hosts.map((host) => (
        <HostMetricsCard key={host.hostname} metrics={host} />
      ))}
    </div>
  );
}
