"use client";


import Button, { ButtonRef } from "@/core/presentation/components/button";
import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { useAppStore } from "@/libs/stores/app-store";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { LuClipboardCopy, LuTrash2 } from "react-icons/lu";
import FormSelect from "@/core/presentation/components/inputs/form/form-select";
import { toast } from "sonner";
import { useWebSocket } from "@/core/presentation/hooks/use-webSocket";
import { closeCurrentDialog } from "@/libs/dialog-ref";
import { useWorker } from "../models/use-worker";
import { WorkerResponseDto, WorkerWithRelationsResponseDto } from "../api/worker.api.types";
import { useZone } from "src/features/mesh/models/use-zone";

interface WorkerDetailsProps {
  workerId: string;
}

export default function WorkerDetails({ workerId }: WorkerDetailsProps) {
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

  const methods = useForm();
  const { handleSubmit, control } = methods;

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
                onClick={() => console.log('Unassign IP')}
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
