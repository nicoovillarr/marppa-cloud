"use client";


import { Button, ButtonRef } from "@/core/ui/Button";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { WorkerWithRelationsResponseDto } from "../api/worker.api.types";
import { LuClipboardCopy, LuTrash2 } from "react-icons/lu";
import { FormSelect } from "@/core/ui/inputs/form/FormSelect";
import { toast } from "sonner";
import { useWorker } from "../models/use-worker";
import { useZone } from "src/features/mesh/models/use-zone";
import { useNode } from "src/features/mesh/models/use-node";
import { useDialog } from "@/core/ui/DialogProvider";
import { useWebSocket } from "@/core/ui/WebsocketProvider";

interface WorkerDetailsProps {
  workerId: string;
}

export function WorkerDetails({ workerId }: WorkerDetailsProps) {
  const [worker, setWorker] = useState<WorkerWithRelationsResponseDto>();

  const buttonRef = useRef<ButtonRef | null>(null);

  const {
    updateWorker,
    fetchWorker,
  } = useWorker();

  const {
    zones,
    fetchZones,
  } = useZone();

  const { deleteNode } = useNode();
  const { showDialog } = useDialog();
  const { subscribe } = useWebSocket();

  const methods = useForm();
  const { handleSubmit, control } = methods;

  const onUnassign = () => {
    if (!worker?.node) return;

    const { id: nodeId, zoneId } = worker.node;

    showDialog({
      type: "confirm",
      title: "Unassign IP",
      description:
        "Release this IP reservation and detach the worker's NIC from the zone.",
      confirmText: "Unassign",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await deleteNode(zoneId, nodeId);
        if (ok) {
          toast.success("Node unassignment queued");
          const refreshed = await fetchWorker(workerId);
          setWorker(refreshed);
        } else {
          toast.error("Failed to unassign IP");
        }
      },
    });
  };

  const onSubmit = async (data: any) => {
    console.log("Form submitted with data:", data);

    buttonRef.current?.setIsLoading(true);
    buttonRef.current?.setProgress(0);

    try {
      await updateWorker(
        workerId,
        data.name
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

  useEffect(() => {
    fetchZones();

    if (workerId) {
      fetchWorker(workerId).then(w => {
        setWorker(w);

        methods.reset({
          ...w,
          ipAddress: w?.node?.ipAddress || "N/A",
        });
      })
    }
  }, [workerId]);

  useEffect(() => {
    if (!worker) return;

    methods.reset({
      ...worker,
      ipAddress: worker?.node?.ipAddress || "N/A",
    });
  }, [worker]);

  useEffect(() => {
    if (!workerId) return;

    const unsubscribe = subscribe(`hive:worker:${workerId}`, (message) => {
      const status: string | undefined = message?.data?.status;

      if (message?.type === "UPDATED" && status) {
        setWorker((prev) => (prev ? { ...prev, status } : prev));
        return;
      }

      fetchWorker(workerId).then((w) => setWorker(w));
    });

    return unsubscribe;
  }, [workerId, subscribe]);

  if (!worker) {
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
          {worker?.node ? (
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
                  navigator.clipboard.writeText(worker.node.ipAddress)
                }
              />

              <Button
                className="shrink-0 mt-6"
                text="Unassign IP"
                type="button"
                style={"danger"}
                icon={<LuTrash2 />}
                onClick={onUnassign}
                disabled={worker.status !== "INACTIVE"}
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
