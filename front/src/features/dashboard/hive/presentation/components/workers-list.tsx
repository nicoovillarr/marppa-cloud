"use client";

import "@/dashboard/hive/hiveFactory";

import { useAppStore } from "@/libs/stores/app-store";
import { useShallow } from "zustand/shallow";
import { HiveService } from "../services/hiveService";
import Table, {
  ContextMenuGroupGenerator,
  TableHandler,
} from "@/core/presentation/components/table";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import WorkerDetails from "./worker-details";
import { ContextMenuGroup } from "@/core/presentation/components/context-menu";
import { ResourceStatus } from "@prisma/client";
import { toast } from "sonner";
import BreadCrumb from "@/core/presentation/components/breadcrumb";
import Button from "@/core/presentation/components/button";
import { LuListPlus, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { useWebSocket } from "@/core/presentation/hooks/use-webSocket";
import { useAuth } from "@/core/presentation/hooks/use-auth";

export default function WorkersList() {
  const { showDialog } = useDialog();
  const { claims } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();

  const { user, workers, setWorkers } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      workers: state.workers,
      setWorkers: state.setWorkers,
    }))
  );

  const tableRef = useRef<TableHandler>(null);

  const [columns, setColumns] = useState<ColumnMapping<WorkerDTO>>();
  const [contextMenu, setContextMenu] =
    useState<ContextMenuGroupGenerator<WorkerDTO>>();

  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(
    new Set()
  );

  const selectWorkers = (indexes: Set<number>) => {
    const source = Array.from(indexes).map((i) => workers[i].id);
    const set = new Set(source);
    setSelectedWorkers(set);
  };

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
      title: "Worker Details",
      content: <WorkerDetails workerId={workerId} />,
      canClose: () => true,
      onClose: () => tableRef.current?.clearSelectedRows(),
    });
  };

  const startWorker = async (workerId: string) => {
    const response = await HiveService.instance.startWorker(workerId);
    console.log("Worker started successfully:", response);
    setWorkers(
      workers.map((worker) =>
        worker.id === workerId
          ? { ...worker, status: ResourceStatus.QUEUED }
          : worker
      )
    );
  };

  const stopWorker = async (workerId: string) => {
    const response = await HiveService.instance.stopWorker(workerId);
    console.log("Worker stopped successfully:", response);
    setWorkers(
      workers.map((worker) =>
        worker.id === workerId
          ? { ...worker, status: ResourceStatus.QUEUED }
          : worker
      )
    );
  };

  const deleteSingleWorker = async (workerId: string) => {
    const response = await HiveService.instance.deleteWorker(workerId);
    console.log("Worker deleted successfully:", response);
    setWorkers(
      workers.map((worker) =>
        worker.id !== workerId
          ? worker
          : { ...worker, status: ResourceStatus.QUEUED }
      )
    );
  };

  const refreshList = async () => {
    const fetchedWorkers = await HiveService.instance.fetchWorkers();
    setWorkers(fetchedWorkers);
    toast.success("Worker list refreshed.");
  };

  const broadcastHandler = useCallback((type: string, data: any) => {
    if (type === "SUBSCRIBE_CHANNEL_SUCCEEDED") return;

    const { workers: oldWorkers, setWorkers } = useAppStore.getState();
    const { workerId, data: workerData } = data;

    switch (type) {
      case "UPDATED":
        const workersList = oldWorkers.map((worker) => {
          if (worker.id === workerId) {
            return { ...worker, ...workerData };
          }

          return worker;
        });

        console.log(
          "Worker updated via WebSocket:",
          workersList.find((w) => w.id === workerId)
        );

        setWorkers(workersList);
        break;

      case "CREATED":
        if (oldWorkers.find((w) => w.id === workerId)) {
          break;
        }

        console.log("New worker created via WebSocket:", data);

        setWorkers([data, ...oldWorkers]);
        break;

      case "DELETED":
        if (!oldWorkers.find((w) => w.id === workerId)) {
          break;
        }

        console.log("Worker deleted via WebSocket:", data);

        const newWorkers = oldWorkers.filter((w) => w.id !== workerId);
        setWorkers(newWorkers);
        break;
    }
  }, []);

  useEffect(() => {
    const contextMenu = (rowData: WorkerDTO): ContextMenuGroup[] => [
      {
        label: selectedWorkers.has(rowData.id) ? "Unselect" : "Select",
        action: () => tableRef.current?.selectRow(workers.indexOf(rowData)),
      },
      {
        label: "Start",
        action: () => startWorker(rowData.id),
        disabled:
          rowData.status !== ResourceStatus.INACTIVE ||
          rowData.node == null ||
          rowData.node?.status !== ResourceStatus.ACTIVE,
      },
      {
        label: "Terminate",
        action: () => stopWorker(rowData.id),
        disabled: rowData.status !== ResourceStatus.ACTIVE,
      },
      {
        label: "Delete",
        action: () => deleteSingleWorker(rowData.id),
        disabled: rowData.status !== ResourceStatus.INACTIVE,
      },
    ];
    setContextMenu(() => contextMenu);

    const columns: ColumnMapping<WorkerDTO> = {
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
        renderFn: (value: WorkerDTO) => value.node?.ipAddress || "N/A",
      },
      status: {
        label: "Status",
        minWidth: "150px",
      },
      cpuCores: {
        label: "vCPU Cores",
        minWidth: "150px",
        renderFn: (value: WorkerDTO) => value.instanceType?.cpuCores || "N/A",
      },
      ramMB: {
        label: "RAM (MB)",
        minWidth: "150px",
        renderFn: (value: WorkerDTO) => value.instanceType?.ramMB || "N/A",
      },
      diskGB: {
        label: "Disk (GB)",
        minWidth: "150px",
        renderFn: (value: WorkerDTO) => value.instanceType?.diskGB || "N/A",
      },
    };

    setColumns(columns);
  }, [workers]);

  useEffect(() => {
    if (!claims) return;

    const keys = claims.companies.map((c) => `company:${c}:hive`);
    for (const key of keys) {
      subscribe(key, (message) => {
        const { type, data } = message;
        broadcastHandler(type, data);
      });
    }

    return () => {
      for (const key of keys) {
        unsubscribe(key);
      }
    };
  }, [user, claims]);

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Workers
        </h2>

        <Button
          icon={<LuRefreshCcw />}
          onClick={refreshList}
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
            columns={columns}
            data={workers}
            contextMenuGroups={contextMenu}
            onRowClick={(rowData) => onRowClick(rowData.id)}
            onSelectionChange={selectWorkers}
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
                  onClick={() => deleteSingleWorker(selectedWorkers[0])}
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
