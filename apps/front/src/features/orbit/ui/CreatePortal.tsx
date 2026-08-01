"use client";

import { toast } from "sonner";
import { PortalForm } from "./PortalForm";
import { redirect } from "next/navigation";
import { usePortal } from "../models/use-portal";
import { usePortalStore } from "../models/portal.store";
import { useEffect } from "react";
import { CreatePortalDto } from "../api/portal.api.types";

export function CreatePortal() {
  const {
    portalTypes,
    fetchPortalTypes,
    createPortal,
  } = usePortal();

  const onSubmit = async (form: CreatePortalDto) => {
    const portal = await createPortal(form);

    if (!portal) {
      toast.error(
        usePortalStore.getState().error ?? "Failed to create portal."
      );
      return;
    }

    toast.success("Portal created successfully!");
    redirect(`/dashboard/orbit/portals`);
  };

  useEffect(() => {
    fetchPortalTypes();
  }, []);

  return <PortalForm
    onSubmit={onSubmit}
    portalTypes={portalTypes}
  />;
}
