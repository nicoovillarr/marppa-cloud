"use client";

import BreadCrumb from "@/core/components/breadcrumb";
import { Button, ButtonRef } from "@/core/components/button";
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { HiveService } from "../services/hive-service";
import { useAppStore } from "@/store/app-store";
import { WorkerDTO } from "@/types/dto/worker-dto";
import { useShallow } from "zustand/shallow";
import { redirect } from "next/navigation";
import FormInput from "@/core/components/inputs/form/form-input";
import Slider from "@/core/components/inputs/slider";

export default function CreateWorkerForm() {
  const { user, workers } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      workers: state.workers,
    }))
  );

  const buttonRef = useRef<ButtonRef>(null);

  const methods = useForm();

  const { handleSubmit, setError, control } = methods;

  const createNewWorker = async (name: string): Promise<WorkerDTO | null> => {
    console.log("Create New Worker");

    const response = await HiveService.createHive(
      user.companyId,
      name,
      1,
      1024
    );

    if (!response.success) {
      console.error("Failed to create new worker:", response.data);
      return null;
    }

    console.log("New worker created successfully:", response.data);

    const { data: newWorker } = response;
    newWorker.createdAt = new Date(newWorker.createdAt);
    return newWorker as WorkerDTO;
  };

  const onSubmit = async (data: any) => {
    console.log("Form submitted with data:", data);
    buttonRef.current?.setIsLoading(true);

    const newWorker = await createNewWorker(data.workerName);
    if (newWorker) {
      await buttonRef.current?.setIsLoading(false);
      redirect(`/dashboard/hive`);
    } else {
      setError("workerName", {
        type: "manual",
        message: "Failed to create worker",
      });
      buttonRef.current?.setError("Failed to create worker");
    }
  };

  return (
    <main className="flex flex-col gap-8 w-screen 2xl:max-w-[1440px] mx-auto p-4 md:p-8">
      <BreadCrumb />
      <FormProvider {...methods}>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormInput
            controlName="workerName"
            control={control}
            label="Worker Name"
            required
            className="w-full"
          />
          <Slider
            min={256}
            max={1024 * 8}
            step={512}
            defaultValue={[512]}
            valueText={(value) => `${value[0]} MB`}
          />
          <Button ref={buttonRef} text="Create Worker" type="submit" />
        </form>
      </FormProvider>
    </main>
  );
}
