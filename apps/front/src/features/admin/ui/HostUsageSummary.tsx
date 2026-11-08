"use client";

import { Card } from "@/core/ui/Card";
import { IconType } from "react-icons";
import { LuBox, LuCpu, LuHardDrive, LuMemoryStick } from "react-icons/lu";
import {
  AdminHostUsageResponseDto,
  HostBudgetSource,
  StorageMedia,
  VcpuUsageDto,
} from "../api/admin.api.types";

const NEAR_FULL_RATIO = 0.9;

const MEDIA_LABEL: Record<StorageMedia, string> = {
  NVME: "NVMe",
  SSD: "SSD",
  HDD: "HDD",
};

interface UsageTileProps {
  icon: IconType;
  title: string;
  subtitle: string;
  format: (value: number) => string;
  used: number;
  budget: number;
  reserved?: number;
  breakdown: string;
  detail: string;
}

function ratio(value: number, budget: number): number {
  if (budget <= 0) return value > 0 ? 1 : 0;
  return Math.min(value / budget, 1);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 1 : 0)}%`;
}

function UsageTile({
  icon,
  title,
  subtitle,
  format,
  used,
  budget,
  reserved,
  breakdown,
  detail,
}: UsageTileProps) {
  const usedRatio = ratio(used, budget);
  const reservedRatio = reserved == null ? 0 : ratio(reserved, budget);
  const nearFull = Math.max(usedRatio, reservedRatio) >= NEAR_FULL_RATIO;

  return (
    <Card icon={icon} title={title} subtitle={subtitle}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-2xl tabular-nums">
          {format(used)}
          <span className="text-base text-ink-muted"> / {format(budget)}</span>
        </p>
        <p
          className={`font-mono text-sm tabular-nums ${nearFull ? "text-status-danger" : "text-ink-muted"}`}
        >
          {percent(usedRatio)}
        </p>
      </div>

      <div
        className="relative mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken"
        role="meter"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={used}
      >
        {reserved != null && (
          <div
            className="absolute inset-y-0 left-0 bg-accent-tint"
            style={{ width: `${reservedRatio * 100}%` }}
          />
        )}
        <div
          className={`absolute inset-y-0 left-0 ${nearFull ? "bg-status-danger" : "bg-accent"}`}
          style={{ width: `${usedRatio * 100}%` }}
        />
      </div>

      <p className="mt-2 text-sm text-ink-muted">{breakdown}</p>
      <p className="text-sm text-ink-muted">{detail}</p>
    </Card>
  );
}

function cores(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function gibibytes(valueMB: number): string {
  return `${(valueMB / 1024).toFixed(1)} GB`;
}

function gigabytes(value: number): string {
  return `${value} GB`;
}

const SOURCE_LABEL: Record<HostBudgetSource, string> = {
  REPORTED: "reported",
  CONFIGURED: "configured fallback",
};

function vcpuBreakdown(vcpu: VcpuUsageDto, source: HostBudgetSource): string {
  const budgetedCores = vcpu.budget / vcpu.overcommit;
  const formula = `Budget ${cores(vcpu.budget)} = ${cores(budgetedCores)} cores × ${cores(vcpu.overcommit)} overcommit`;

  if (budgetedCores === vcpu.reported) {
    return `${formula} (${SOURCE_LABEL[source]})`;
  }

  return `${formula} (${cores(vcpu.reported)} ${SOURCE_LABEL[source]})`;
}

function capacityBreakdown(
  budget: number,
  reported: number,
  source: HostBudgetSource,
  format: (value: number) => string,
): string {
  if (budget === reported) {
    return `Budget ${format(budget)}, all of it ${SOURCE_LABEL[source]}`;
  }

  return `Budget ${format(budget)} of ${format(reported)} ${SOURCE_LABEL[source]}, ${format(Math.max(reported - budget, 0))} held back`;
}

function mediaLabel(media: StorageMedia[]): string {
  if (media.length === 0) return "media not reported";
  return media.map((value) => MEDIA_LABEL[value]).join(" + ");
}

export function HostUsageSummary({ usage }: { usage: AdminHostUsageResponseDto }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UsageTile
        icon={LuCpu}
        title="vCPU"
        subtitle="Running vs budget"
        format={cores}
        used={usage.vcpu.running}
        reserved={usage.vcpu.provisioned}
        budget={usage.vcpu.budget}
        breakdown={vcpuBreakdown(usage.vcpu, usage.source)}
        detail={`${cores(usage.vcpu.provisioned)} allocated including stopped resources`}
      />
      <UsageTile
        icon={LuMemoryStick}
        title="RAM"
        subtitle="Running vs budget"
        format={gibibytes}
        used={usage.ramMB.running}
        reserved={usage.ramMB.provisioned}
        budget={usage.ramMB.budget}
        breakdown={capacityBreakdown(usage.ramMB.budget, usage.ramMB.reported, usage.source, gibibytes)}
        detail={`${gibibytes(usage.ramMB.provisioned)} allocated including stopped resources`}
      />
      <UsageTile
        icon={LuHardDrive}
        title="Worker disks"
        subtitle={mediaLabel(usage.workerDiskGB.media)}
        format={gigabytes}
        used={usage.workerDiskGB.provisioned}
        budget={usage.workerDiskGB.budget}
        breakdown={capacityBreakdown(usage.workerDiskGB.budget, usage.workerDiskGB.reported, usage.source, gigabytes)}
        detail={`${gigabytes(Math.max(usage.workerDiskGB.budget - usage.workerDiskGB.provisioned, 0))} free for boot disks and volumes`}
      />
      <UsageTile
        icon={LuBox}
        title="Atom volumes"
        subtitle={mediaLabel(usage.atomVolumeGB.media)}
        format={gigabytes}
        used={usage.atomVolumeGB.provisioned}
        budget={usage.atomVolumeGB.budget}
        breakdown={capacityBreakdown(usage.atomVolumeGB.budget, usage.atomVolumeGB.reported, usage.source, gigabytes)}
        detail={`${gigabytes(Math.max(usage.atomVolumeGB.budget - usage.atomVolumeGB.provisioned, 0))} free for new volumes`}
      />
    </div>
  );
}
