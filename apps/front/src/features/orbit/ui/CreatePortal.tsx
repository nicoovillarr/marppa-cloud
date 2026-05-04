"use client";

import { toast } from "sonner";
import { PortalForm } from "./PortalForm";
import { redirect } from "next/navigation";
import { usePortal } from "../models/use-portal";
import { useEffect } from "react";
import { CreatePortalDto } from "../api/portal.api.types";

export function CreatePortal() {
  const {
    portalTypes,
    fetchPortalTypes,
    createPortal,
  } = usePortal();

  const onSubmit = async (form: CreatePortalDto) => {
    try {
      await createPortal(form);
      toast.success("Portal created successfully!");
      redirect(`/dashboard/orbit/portals`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create portal.");
    }
  };

  useEffect(() => {
    fetchPortalTypes();
  }, []);

  return <PortalForm
    onSubmit={onSubmit}
    portalTypes={portalTypes}
  />;
}
