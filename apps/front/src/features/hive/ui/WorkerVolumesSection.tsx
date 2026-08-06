"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuUnlink } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { InlineCode } from "@/core/ui/InlineCode";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { Select } from "@/core/ui/inputs/Select";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { workerDiskApi } from "../api/worker-disk.api";
import { WorkerDiskResponseDto } from "../api/worker-disk.api.types";
import { useWorkerDisk } from "../models/use-worker-disk";
import { useVolumeRealtime } from "../models/use-volume-realtime";

interface WorkerVolumesSectionProps {
  workerId: string;
  editable: boolean;
}

export function WorkerVolumesSection({
  workerId,
  editable,
}: WorkerVolumesSectionProps) {
  const { disks, load, attachDisk, detachDisk, busy } = useWorkerDisk();
  const [available, setAvailable] = useState<WorkerDiskResponseDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    await load(workerId);
    const all = await workerDiskApi.list();
    setAvailable(
      all.filter(
        (disk) =>
          disk.workerId === null && disk.status === ResourceStatus.INACTIVE,
      ),
    );
  }, [load, workerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVolumeRealtime(refresh);

  const options = useMemo(
    () =>
      available.map((disk) => ({
        value: disk.id,
        displayText: `${disk.name} — ${disk.sizeGiB} GiB → ${disk.mountPoint}`,
      })),
    [available],
  );

  const attach = async () => {
    const disk = available.find((d) => d.id === selectedId);
    if (!disk) return;

    if (await attachDisk(disk, workerId)) {
      setSelectedId(null);
      await refresh();
    }
  };

  const detach = async (disk: WorkerDiskResponseDto) => {
    if (await detachDisk(disk)) {
      await refresh();
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm">Volumes</h3>

      <p className="text-xs text-ink-muted">
        {editable
          ? "Attaching or detaching writes to the stopped VM and its /etc/fstab."
          : "The worker must be stopped to attach or detach a volume."}
      </p>

      {disks.length === 0 ? (
        <p className="text-xs text-ink-muted">
          No volumes attached. The boot disk is fixed and not listed here.
        </p>
      ) : (
        <ul className="space-y-1">
          {disks.map((disk) => (
            <li
              key={disk.id}
              className="flex items-center justify-between gap-2 text-sm border border-border dark: rounded px-2 py-1"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium">
                  {disk.name}{" "}
                  <span className="text-ink-muted">({disk.sizeGiB} GiB)</span>
                </span>
                <span className="text-xs text-ink-muted truncate">
                  {disk.mountPoint}
                  {disk.deviceTarget ? ` · ${disk.deviceTarget}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <StatusBadge status={disk.status} />
                <Button
                  icon={<LuUnlink />}
                  style="danger"
                  disabled={busy || !editable}
                  onClick={() => detach(disk)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="flex gap-2 items-center">
          <Select
            className="w-full"
            options={options}
            placeholder={
              options.length > 0
                ? "Attach an existing volume"
                : "No free volumes available"
            }
            disabled={busy || options.length === 0}
            onChangedValue={(value) => setSelectedId(Number(value))}
          />
          <Button
            text="Attach"
            disabled={busy || selectedId === null}
            onClick={attach}
          />
        </div>
      )}

      <p className="text-xs text-ink-muted">
        Volumes are created from <InlineCode code="Hive → Volumes" /> and survive
        both a detach and the deletion of this worker.
      </p>
    </section>
  );
}
