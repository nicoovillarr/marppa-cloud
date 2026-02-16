"use client";

import Table, {
  TableHandler,
} from "@/core/presentation/components/table";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Button from "@/core/presentation/components/button";
import { LuListPlus, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { useWorker } from "../models/use-worker";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { WorkerWithRelationsResponseDto } from "../api/worker.api.types";
import { ColumnMapping } from "@/libs/types/column-mapping";

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
  },
  cpuCores: {
    label: "vCPU Cores",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.flavor.cpuCores,
  },
  ramMB: {
    label: "RAM (MB)",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.flavor.ramMB,
  },
  diskGB: {
    label: "Disk (GB)",
    minWidth: "150px",
    renderFn: (value: WorkerWithRelationsResponseDto) => value.flavor.diskGB,
  },
};

export default function WorkersList() {
  const { workers, fetchWorkers } = useWorker();

  const tableRef = useRef<TableHandler<string>>(null);

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
          href="/dashboard/hive/create"
        />
      </header>
      {workers && workers.length > 0 ? (
        <>
          <Table
            ref={tableRef}
            select="multiple"
            columns={COLUMNS}
            data={workers}
            contextMenuGroups={contextMenuGroups}
            onRowClick={(rowData) => onRowClick(rowData.id)}
            onSelectionChange={selectWorkers}
            getKey={(worker) => worker.id}
          />
          <div className="flex justify-between items-center gap-4 mt-4">
            <p className="text-sm text-gray-600">
              Selected Workers:
              <span className="font-bold ml-1">{selectedWorkers.size}</span>
            </p>
            {selectedWorkers.size === 1 && (
              <aside className="flex items-center gap-2">
                <Button
                  text="Terminate"
                  icon={<LuTrash2 />}
                  style="danger"
                  onClick={() => console.log('Delete worker')}
                />
              </aside>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No workers found.</p>
      )}
    </section>
  );
}
