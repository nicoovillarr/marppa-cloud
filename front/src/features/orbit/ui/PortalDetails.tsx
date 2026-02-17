"use client";

import { PortalForm } from "./PortalForm";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { CreatePortalDto, PortalWithTranspondersResponseDto } from "../api/portal.api.types";
import { usePortal } from "../models/use-portal";

interface PortalDetailsProps {
  portalId: string;
  portalTypes: string[];
}
export function PortalDetails({
  portalId,
  portalTypes,
}: PortalDetailsProps) {
  const {
    portals,
    fetchPortalById,
    updatePortal,
  } = usePortal();

  const [portal, setPortal] = useState<PortalWithTranspondersResponseDto>(undefined);

  const onSubmit = async (data: Partial<CreatePortalDto>) => {
    const updatedPortal = await updatePortal(
      portal.id,
      data
    );

    setPortal(updatedPortal);
    toast.success("Portal updated successfully!");
  };

  useEffect(() => {
    fetchPortalById(portalId).then(portal => setPortal(portal));
  }, [portalId]);

  return (
    <PortalForm
      portal={portal}
      portalTypes={portalTypes}
      onSubmit={onSubmit}
    />
  );
}
