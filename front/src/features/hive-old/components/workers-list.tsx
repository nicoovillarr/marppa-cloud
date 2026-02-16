"use client";

import BreadCrumb from "@/core/presentation/components/breadcrumb";
import { Button } from "@/core/presentation/components/button";
import { useAppStore } from "@/store/app-store";
import { useShallow } from "zustand/shallow";
import { HiveService } from "../services/hive-service";
import Table from "@/core/presentation/components/table";
import { ColumnMapping } from "@/types/column-mapping";
import { useState } from "react";
import { WorkerDTO } from "@/types/dto/worker-dto";
import { LuListPlus, LuTrash2 } from "react-icons/lu";

export default function WorkersList() {
  const { user, workers, setWorkers } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      workers: state.workers,
      setWorkers: state.setWorkers,
    }))
  );

  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(
    new Set()
  );

  const selectWorker = (workerId: string) => {
    const newSelectedWorkers = new Set(selectedWorkers);
    if (newSelectedWorkers.has(workerId)) {
      newSelectedWorkers.delete(workerId);
    } else {
      newSelectedWorkers.add(workerId);
    }
    setSelectedWorkers(newSelectedWorkers);
  };

  const columns: ColumnMapping = {
    actions: {
      label: "",
      width: "25px",
      minWidth: "25px",
      renderFn: (value: WorkerDTO) => (
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={selectedWorkers.has(value.id)}
          onChange={() => selectWorker(value.id)}
        />
      ),
    },
    id: {
      label: "ID",
      minWidth: "150px",
    },
    name: {
      label: "Name",
      width: "100%",
      minWidth: "150px",
    },
    status: {
      label: "Status",
      minWidth: "150px",
    },
    createdAt: {
      label: "Created At",
      minWidth: "250px",
    },
  };

  const deleteSelectedWorkers = async () => {
    if (selectedWorkers.size === 0) {
      console.warn("No workers selected for deletion.");
      return;
    }

    console.log("Delete Selected Workers:", selectedWorkers);

    const response = await HiveService.deleteWorkers(
      Array.from(selectedWorkers)
    );

    if (!response.success) {
      console.error("Failed to delete workers:", response.data);
      return;
    }

    console.log("Workers deleted successfully:", response.data);
    setWorkers(workers.filter((worker) => !selectedWorkers.has(worker.id)));
    setSelectedWorkers(new Set());
  };

  const deleteSingleWorker = async (workerId: string) => {
    console.log("Delete Worker:", workerId);
    const response = await HiveService.deleteWorkers([workerId]);
    if (!response.success) {
      console.error("Failed to delete worker:", response.data);
      return;
    }

    console.log("Worker deleted successfully:", response.data);
    setWorkers(workers.filter((worker) => worker.id !== workerId));
    setSelectedWorkers((prev) => {
      const newSelected = new Set(prev);
      newSelected.delete(workerId);
      return newSelected;
    });
  };

  const tableContextMenuGroups = (rowData: WorkerDTO) => [
    {
      label: selectedWorkers.has(rowData.id) ? "Unselect" : "Select",
      action: () => selectWorker(rowData.id),
    },
    {
      label: "Terminate",
      color: "red",
      action: () => deleteSingleWorker(rowData.id),
    },
  ];

  return (
    <main className="flex flex-col gap-8 w-screen 2xl:max-w-[1440px] mx-auto p-4 md:p-8">
      <BreadCrumb />

      <header className="w-full flex flex-col">
        <h1 className="font-bold text-2xl">Hive</h1>
        <p className="text-sm text-gray-500">
          Manage your workers, deploy applications, and scale your
          infrastructure with ease.
        </p>
      </header>

      <section>
        <header className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
            Your Workers
          </h2>
          <Button
            text="Create New"
            icon={<LuListPlus />}
            href="/dashboard/hive/create-worker"
          />
        </header>
        {workers && workers.length > 0 ? (
          <>
            <Table
              columns={columns}
              data={workers}
              contextMenuGroups={tableContextMenuGroups}
            />
            <div className="flex justify-between items-center gap-4 mt-4">
              <p className="text-sm text-gray-600">
                Selected Workers:
                <span className="font-bold ml-1">{selectedWorkers.size}</span>
              </p>
              {selectedWorkers.size > 0 && (
                <aside className="flex items-center gap-2">
                  <Button
                    text="Terminate"
                    icon={<LuTrash2 />}
                    style="danger"
                    onClick={deleteSelectedWorkers}
                  />
                </aside>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">No workers found.</p>
        )}
      </section>
    </main>
  );
}
