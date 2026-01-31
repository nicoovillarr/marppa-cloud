"use client";

import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import Button from "@/core/presentation/components/button";
import { MeshService } from "../services/meshService";
import { useAppStore } from "@/libs/stores/app-store";
import { useShallow } from "zustand/shallow";
import NodesList from "./nodesList";
import { useWebSocket } from "@/core/presentation/hooks/use-webSocket";
import { closeCurrentDialog } from "@/libs/dialog-ref";
import { useParams } from "next/navigation";
import { TableSkeleton } from "@/core/presentation/components/AsyncTable";

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

export default function ZoneDetails() {
  const { zoneId } = useParams<{ zoneId: string }>();

  const { subscribe, unsubscribe } = useWebSocket();

  const { zones, setZones } = useAppStore(
    useShallow((state) => ({
      zones: state.zones,
      setZones: state.setZones,
    }))
  );

  const zone = zones?.find((z) => z.id === zoneId);

  const methods = useForm();
  const { control, handleSubmit, reset } = methods;

  const onSubmit = async (data: any) => {
    const validationResults = await MeshService.instance.validateZone({
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

    const updatedZone = await MeshService.instance.updateZone(zone.id, data);
    setZones(zones.map((z) => (z.id === updatedZone.id ? updatedZone : z)));
  };

  const broadcastHandler = useCallback((type: string, data: any) => {
    if (type === "SUBSCRIBE_CHANNEL_SUCCEEDED") return;

    const { zones: oldZones, setZones } = useAppStore.getState();
    const { zoneId, data: zoneData } = data;

    switch (type) {
      case "UPDATED":
        const zonesList = oldZones.map((zone) => {
          if (zone.id === zoneId) {
            return { ...zone, ...zoneData };
          }

          return zone;
        });

        console.log(
          "Zone updated via WebSocket:",
          zonesList.find((w) => w.id === zoneId)
        );

        setZones(zonesList);
        break;

      case "CREATED":
        if (oldZones.find((w) => w.id === zoneId)) {
          break;
        }

        console.log("New zone created via WebSocket:", data);

        setZones([data, ...oldZones]);
        break;

      case "DELETED":
        if (!oldZones.find((w) => w.id === zoneId)) {
          break;
        }

        console.log("Zone deleted via WebSocket:", data);

        const newZones = oldZones.filter((w) => w.id !== zoneId);
        setZones(newZones);

        closeCurrentDialog();
        break;
    }
  }, []);

  useEffect(() => {
    if (zone) {
      reset({
        id: zone.id,
        name: zone.name,
      });
    }
  }, [zone, reset]);

  useEffect(() => {
    if (!zone) return;

    const channel = `zone:${zone.id}`;

    subscribe(channel, (msg: any) => {
      const { type, data } = msg;
      broadcastHandler(type, data);
    });

    return () => {
      unsubscribe(channel);
    };
  }, [zone]);

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

        <NodesList zone={zone} nodes={zone.nodes} />

        <Button className="ml-auto" text="Save" type="submit" />
      </form>
    </FormProvider>
  );
}
