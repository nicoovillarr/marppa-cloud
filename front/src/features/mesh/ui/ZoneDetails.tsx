"use client";

import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import Button from "@/core/presentation/components/button";
import { useParams } from "next/navigation";
import { TableSkeleton } from "@/core/presentation/components/AsyncTable";
import { useZone } from "../models/use-zone";
import { toast } from "sonner";
import { NodesList } from "./NodesList";
import { ZoneWithNodesAndFibers } from "../api/zone.api.types";

export function ZoneDetailsSkeleton() {
  return (
    <div className="flex flex-col w-full mx-auto">
      <article className="w-full flex flex-col gap-2 mb-2">
        <div className="h-4 w-24 bg-gray-300 rounded-md animate-pulse"></div>
        <div className="h-10 w-full bg-gray-300 rounded-md animate-pulse"></div>
      </article>

      <article className="w-full flex flex-col gap-2 mb-4">
        <div className="h-4 w-20 bg-gray-300 rounded-md animate-pulse"></div>
        <div className="h-10 w-full bg-gray-300 rounded-md animate-pulse"></div>
      </article>

      <article className="w-full flex justify-between items-center mb-2">
        <div className="h-8 w-16 bg-gray-300 rounded-md animate-pulse"></div>
        <div className="h-10 w-10 bg-gray-300 rounded-md animate-pulse"></div>
      </article>

      <TableSkeleton rows={8} />
    </div>
  );
}

export function ZoneDetails() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const [zone, setZone] = useState<ZoneWithNodesAndFibers | null>(null);

  const {
    fetchZone,
    validateZone,
    updateZone,
  } = useZone();

  const methods = useForm();
  const { control, handleSubmit, reset } = methods;

  const onSubmit = async (data: any) => {
    const validationResults = await validateZone({
      ...zone,
      ...data,
    });

    if (Object.keys(validationResults).length > 0) {
      Object.entries(validationResults).forEach(([key, message]) => {
        methods.setError(key as any, {
          type: "manual",
          message: message,
        });
      });
      return;
    }

    const { name, description } = data;

    const updatedZone = await updateZone(zone.id, name, description);
    if (updatedZone) {
      toast.success("Zone updated successfully");
    } else {
      toast.error("Failed to update zone");
    }
  };

  useEffect(() => {
    fetchZone(zoneId).then((zone) => setZone(zone));
  }, []);

  useEffect(() => {
    if (zone) {
      reset({
        id: zone.id,
        name: zone.name,
        description: zone.description,
      });
    }
  }, [zone, reset]);

  if (!zone) {
    return <ZoneDetailsSkeleton />;
  }

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          controlName="name"
          control={control}
          label="Zone Name"
          required
        />

        <FormInput
          controlName="description"
          control={control}
          label="Description"
          className="w-full"
        />

        <NodesList zoneId={zone.id} />

        <Button className="ml-auto" text="Save" type="submit" />
      </form>
    </FormProvider>
  );
}
