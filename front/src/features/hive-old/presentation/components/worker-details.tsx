"use client";

import "@/dashboard/hive/hiveFactory";

import Button, { ButtonRef } from "@/core/presentation/components/button";
import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { useAppStore } from "@/libs/stores/app-store";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { HiveService } from "../services/hiveService";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { LuClipboardCopy, LuTrash2 } from "react-icons/lu";
import FormSelect from "@/core/presentation/components/inputs/form/form-select";
import { toast } from "sonner";
import { useWebSocket } from "@/core/presentation/hooks/use-webSocket";
import { closeCurrentDialog } from "@/libs/dialog-ref";

interface WorkerDetailsProps {
  workerId: string;
}

export default function WorkerDetails({ workerId }: WorkerDetailsProps) {
  const { subscribe, unsubscribe } = useWebSocket();

  const buttonRef = useRef<ButtonRef | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerDTO | null>(null);

  const { isInitialized, workers, setWorkers, zones, setZones } = useAppStore(
    useShallow((state) => ({
      isInitialized: state.isInitialized,
      workers: state.workers,
      setWorkers: state.setWorkers,
      zones: state.zones,
      setZones: state.setZones,
    }))
  );

  const methods = useForm();
  const { handleSubmit, control } = methods;

  const onSubmit = async (data: any) => {
    console.log("Form submitted with data:", data);

    buttonRef.current?.setIsLoading(true);
    buttonRef.current?.setProgress(0);

    try {
      await HiveService.instance.updateWorker(
        workerId,
        data
      );
      buttonRef.current?.setIsLoading(false);
    } catch (error) {
      console.error("Error updating worker:", error);
      buttonRef.current?.setIsLoading(false);
      toast.error("Failed to update worker. Please try again.");
    } finally {
      buttonRef.current?.setIsLoading(false);
    }
  };

  const unassignIP = async () => {
    if (!selectedWorker) return;

    const response = await HiveService.instance.updateWorker(
      selectedWorker.id,
      {
        ...selectedWorker,
        zoneId: null,
      }
    );

    console.log("IP unassigned successfully:", response);
  };

  const broadcastHandler = (type: string, data: any) => {
    switch (type) {
      case "UPDATED":
        const { workers: oldWorkers, setWorkers } = useAppStore.getState();

        const newWorkersList = oldWorkers.map((w) =>
          w.id === workerId ? { ...w, ...data } : w
        );

        console.log(
          "Worker updated via WebSocket:",
          newWorkersList.find((w) => w.id === workerId)
        );

        setWorkers(newWorkersList);
        break;

      case "DELETED":
        if (selectedWorker && selectedWorker.id === data.id) {
          console.log("Selected worker has been deleted via WebSocket.");
          toast.info("This worker has been deleted.");
          setSelectedWorker(null);
          closeCurrentDialog();
        }
        break;
    }
  };

  useEffect(() => {
    if (workerId) {
      const worker = workers.find((w) => w.id === workerId);
      setSelectedWorker(worker);

      methods.reset({
        ...worker,
        ipAddress: worker?.node?.ipAddress || "N/A",
      });
    }
  }, [workerId, workers, methods]);

  useEffect(() => {
    if (!workerId) return;

    const key = `hive:worker:${workerId}`;
    subscribe(key, (msg: any) => {
      const { type, data } = msg;
      broadcastHandler(type, data);
    });

    return () => unsubscribe(key);
  }, [workerId]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  if (!selectedWorker) {
    return <div>Worker not found</div>;
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          controlName="name"
          label="Worker Name"
          control={control}
          required
        />

        <div className="flex gap-2 items-center">
          {selectedWorker?.node ? (
            <>
              <FormInput
                controlName="ipAddress"
                label="IP Address"
                control={control}
                className="w-full"
                required
                disabled
              />

              <Button
                className={`shrink-0 mt-6 h-10`}
                icon={<LuClipboardCopy />}
                type="button"
                style="secondary"
                onClick={() =>
                  navigator.clipboard.writeText(selectedWorker.node.ipAddress)
                }
              />

              <Button
                className="shrink-0 mt-6"
                text="Unassign IP"
                type="button"
                style={"danger"}
                icon={<LuTrash2 />}
                onClick={unassignIP}
                disabled={selectedWorker.status !== "INACTIVE"}
              />
            </>
          ) : (
            <FormSelect
              className="w-full"
              control={control}
              controlName="zoneId"
              label="IP Address"
              options={zones?.map((zone) => ({
                value: zone.id,
                displayText: `${zone.cidr} (${zone.name})`,
              }))}
              tooltip={
                !zones || zones.length === 0
                  ? "No zones available. Please create a zone first."
                  : ""
              }
              disabled={!zones || zones.length === 0}
              placeholder="Select a Zone"
              clearText="None"
            />
          )}
        </div>

        <Button
          ref={buttonRef}
          className="justify-self-end"
          text="Save Changes"
          type="submit"
        />
      </form>
    </FormProvider>
  );
}
