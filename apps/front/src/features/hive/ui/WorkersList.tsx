"use client";
import { useVisibleCompanies } from "@/company/models/use-visible-companies";

import { ColumnMapping, Table } from "@/core/ui/Table";
import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { LuListPlus, LuPlay, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { useWorker } from "../models/use-worker";
import { useHiveRealtime } from "../models/use-hive-realtime";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { WorkerWithRelationsResponseDto } from "../api/worker.api.types";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { useDialog } from "@/core/ui/DialogProvider";
import { WorkerManageDialog } from "./WorkerManageDialog";

const COLUMNS: ColumnMapping<WorkerWithRelationsResponseDto> = {
  id: {
    label: "#",
    minWidth: "150px",
  },
  name: {
    label: "Name",
    width: "100%",
    minWidth: "150px",
  },
  IP: {
    label: "IP Address",
    minWidth: "125px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.node?.ipAddress || "N/A",
  },
  status: {
    label: "Status",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => (
      <StatusBadge status={value.status} />
    ),
  },
  cpuCores: {
    label: "vCPU Cores",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.cpuCores,
  },
  ramMB: {
    label: "RAM (MB)",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.ramMB,
  },
  diskGB: {
    label: "Disk (GB)",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.diskGB,
  },
};

export function WorkersList() {
  const { nameOf, hasMoreThanOne } = useVisibleCompanies();

  const columns = useMemo(
    () =>
      hasMoreThanOne
        ? {
            ...COLUMNS,
            ownerId: {
              label: "Company",
              minWidth: "160px",
              renderFn: (row: any) => nameOf(row.ownerId),
            },
          }
        : COLUMNS,
    [hasMoreThanOne, nameOf]
  );

  const { workers, fetchWorkers, startWorker, terminateWorker } = useWorker();
  const { showDialog } = useDialog();

  useHiveRealtime();

  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(
    new Set()
  );

  const selectWorkers = useCallback((indexes: Set<string>) => {
    const source = Array.from(indexes)
      .map((i) => workers.find(w => w.id === i)?.id)
      .filter((id) => id !== null);
    const set = new Set(source);
    setSelectedWorkers(set);
  }, [workers]);

  const selectWorker = useCallback((workerId: string) => {
    const newSelectedWorkers = new Set(selectedWorkers);
    if (newSelectedWorkers.has(workerId)) {
      newSelectedWorkers.delete(workerId);
    } else {
      newSelectedWorkers.add(workerId);
    }

    setSelectedWorkers(newSelectedWorkers);
  }, [selectedWorkers]);

  const onRowClick = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) {
      toast.error("There was an error fetching the worker.");
      return;
    }

    if (worker.status === ResourceStatus.DELETED) {
      toast.info("This worker has been deleted.");
      return;
    }

    showDialog({
      title: `Manage ${worker.name}`,
      content: (
        <WorkerManageDialog worker={worker} onChanged={() => fetchWorkers()} />
      ),
    });
  };

  const selectedWorker =
    selectedWorkers.size === 1
      ? workers.find((w) => w.id === Array.from(selectedWorkers)[0]) ?? null
      : null;

  const onStart = async (worker: WorkerWithRelationsResponseDto) => {
    const ok = await startWorker(worker.id);
    if (ok) {
      toast.success(`Start of ${worker.name} queued`);
      await fetchWorkers();
    } else {
      toast.error(`Failed to start ${worker.name}`);
    }
  };

  const onTerminate = (worker: WorkerWithRelationsResponseDto) => {
    showDialog({
      type: "confirm",
      title: "Terminate Worker",
      description: `This will shut down ${worker.name}. Continue?`,
      confirmText: "Terminate",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await terminateWorker(worker.id);
        if (ok) {
          toast.success(`Termination of ${worker.name} queued`);
          await fetchWorkers();
        } else {
          toast.error(`Failed to terminate ${worker.name}`);
        }
      },
    });
  };

  const contextMenuGroups = (rowData: WorkerWithRelationsResponseDto) => [
    {
      label: selectedWorkers.has(rowData.id) ? "Unselect" : "Select",
      action: () => selectWorker(rowData.id),
    }
  ];

  useEffect(() => {
    fetchWorkers();
  }, []);

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Workers
        </h2>

        <Button
          icon={<LuRefreshCcw />}
          onClick={() => fetchWorkers()}
          style="secondary"
        />

        <Button
          className="ml-2"
          text="Create New"
          icon={<LuListPlus />}
          href="/dashboard/hive/workers/create"
        />
      </header>
      {workers && workers.length > 0 ? (
        <>
          <Table
            select="multiple"
            columns={columns}
            data={workers}
            contextMenuGroups={contextMenuGroups}
            onRowClick={(rowData) => onRowClick(rowData.id)}
            onSelectionChange={selectWorkers}
            getKey={(worker) => worker.id}
          />
          <div className="flex justify-between items-center gap-4 mt-4">
            <p className="text-sm text-ink-muted">
              Selected Workers:
              <span className="font-bold ml-1">{selectedWorkers.size}</span>
            </p>
            {selectedWorker && (
              <aside className="flex items-center gap-2">
                {selectedWorker.status === ResourceStatus.INACTIVE && (
                  <Button
                    text="Start"
                    icon={<LuPlay />}
                    onClick={() => onStart(selectedWorker)}
                  />
                )}
                {selectedWorker.status === ResourceStatus.ACTIVE && (
                  <Button
                    text="Terminate"
                    icon={<LuTrash2 />}
                    style="danger"
                    onClick={() => onTerminate(selectedWorker)}
                  />
                )}
              </aside>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-muted">No workers found.</p>
      )}
    </section>
  );
}
