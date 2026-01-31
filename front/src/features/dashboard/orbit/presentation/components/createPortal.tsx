"use client";

import { useAppStore } from "@/libs/stores/app-store";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import OrbitService from "../services/orbitService";
import PortalForm from "./portalForm";
import { redirect } from "next/navigation";

export interface CreatePortalProps {
  portalTypes: string[];
}

export default function CreatePortal({ portalTypes }: CreatePortalProps) {
  const { addPortal } = useAppStore(
    useShallow((state) => ({
      addPortal: state.addPortal,
    }))
  );

  const onSubmit = async (form: any) => {
    try {
      const newPortal = await OrbitService.instance.createPortal(form);
      addPortal(newPortal);
      toast.success("Portal created successfully!");
      redirect(`/dashboard/orbit`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create portal.");
    }
  };

  return <PortalForm onSubmit={onSubmit} portalTypes={portalTypes} />;
}
