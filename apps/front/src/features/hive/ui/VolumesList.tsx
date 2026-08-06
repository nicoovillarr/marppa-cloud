"use client";

import { useCallback, useEffect, useMemo } from "react";
import { LuListPlus, LuRefreshCcw, LuServer } from "react-icons/lu";
import { useVisibleCompanies } from "@/company/models/use-visible-companies";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { Button } from "@/core/ui/Button";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { useDialog } from "@/core/ui/DialogProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { WorkerDiskResponseDto } from "../api/worker-disk.api.types";
import { useWorkerDisk } from "../models/use-worker-disk";
import { useVolumeRealtime } from "../models/use-volume-realtime";
import { useWorker } from "../models/use-worker";
import { CreateVolumeDialog } from "./CreateVolumeDialog";

const COLUMNS: ColumnMapping<WorkerDiskResponseDto> = {
  id: {
    label: "#",
    minWidth: "80px",
  },
  name: {
    label: "Name",
    width: "100%",
    minWidth: "150px",
  },
  status: {
    label: "Status",
    minWidth: "150px",
    renderFn: (value: WorkerDiskResponseDto) => (
      <StatusBadge status={value.status} />
    ),
  },
  sizeGiB: {
    label: "Size (GiB)",
    minWidth: "110px",
  },
  mountPoint: {
    label: "Mount point",
    minWidth: "160px",
    renderFn: (value: WorkerDiskResponseDto) => value.mountPoint ?? "—",
  },
  deviceTarget: {
    label: "Device",
    minWidth: "100px",
    renderFn: (value: WorkerDiskResponseDto) => value.deviceTarget ?? "—",
  },
};

export function VolumesList() {
  const { nameOf, hasMoreThanOne } = useVisibleCompanies();
  const { disks, load, detachDisk, deleteDisk, busy } = useWorkerDisk();
  const { workers, fetchWorkers } = useWorker();
  const { showDialog } = useDialog();

  const refresh = useCallback(() => load(), [load]);

  useEffect(() => {
    refresh();
    fetchWorkers();
  }, [refresh]);

  useVolumeRealtime(refresh);

  const nameOfWorker = useCallback(
    (workerId: string | null) =>
      workerId ? workers.find((w) => w.id === workerId)?.name ?? workerId : "—",
    [workers],
  );

  const columns = useMemo(() => {
    const withWorker = {
      ...COLUMNS,
      workerId: {
        label: "Attached to",
        minWidth: "160px",
        renderFn: (row: WorkerDiskResponseDto) => nameOfWorker(row.workerId),
      },
    };

    return hasMoreThanOne
      ? {
          ...withWorker,
          ownerId: {
            label: "Company",
            minWidth: "160px",
            renderFn: (row: any) => nameOf(row.ownerId),
          },
        }
      : withWorker;
  }, [hasMoreThanOne, nameOf, nameOfWorker]);

  const onCreate = () =>
    showDialog({
      title: "Create volume",
      content: <CreateVolumeDialog onCreated={refresh} />,
    });

  const onRowClick = (diskId: number) => {
    const disk = disks.find((d) => d.id === diskId);
    if (!disk) return;

    if (disk.workerId) {
      showDialog({
        type: "confirm",
        title: "Detach volume",
        description: `${disk.name} is attached to ${nameOfWorker(disk.workerId)}. Detaching keeps the data and leaves the volume free to attach elsewhere. The worker must be stopped.`,
        confirmText: "Detach",
        onConfirm: async () => {
          if (await detachDisk(disk)) refresh();
        },
      });
      return;
    }

    showDialog({
      type: "confirm",
      title: "Delete volume",
      description: `This permanently destroys ${disk.name} and everything written to it. This cannot be undone.`,
      confirmText: "Delete",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        if (await deleteDisk(disk)) refresh();
      },
    });
  };

  const visible = disks.filter(
    (disk) => disk.status !== ResourceStatus.DELETED && !disk.isBoot,
  );

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Volumes
        </h2>

        <Button
          className="mr-2 shrink-0"
          text="Workers"
          icon={<LuServer />}
          style="secondary"
          href="/dashboard/hive/workers"
        />

        <Button
          icon={<LuRefreshCcw />}
          onClick={refresh}
          style="secondary"
          disabled={busy}
        />

        <Button
          className="ml-2"
          text="Create New"
          icon={<LuListPlus />}
          onClick={onCreate}
        />
      </header>

      {visible.length > 0 ? (
        <Table
          columns={columns}
          data={visible}
          onRowClick={(rowData) => onRowClick(rowData.id)}
          getKey={(disk) => String(disk.id)}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          No volumes yet. A volume is extra disk space you attach to a stopped
          worker; the boot disk is fixed and managed separately.
        </p>
      )}
    </section>
  );
}
