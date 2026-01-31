
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import PortalForm from "./portalForm";
import OrbitService from "../services/orbitService";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/libs/stores/app-store";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface PortalDetailsProps {
  portalId: string;
  portalTypes: string[];
}
export default function PortalDetails({
  portalId,
  portalTypes,
}: PortalDetailsProps) {
  const { portals, setPortals } = useAppStore(
    useShallow((state) => ({
      portals: state.portals,
      setPortals: state.setPortals,
    }))
  );

  const [portal, setPortal] = useState<PortalDTO>(undefined);

  const onSubmit = async (data: PortalDTO) => {
    const updatedPortal = await OrbitService.instance.updatePortal(
      portal.id,
      data
    );

    const updatedPortals =
      portals?.map((p) => (p.id === updatedPortal.id ? updatedPortal : p)) ||
      [];

    setPortals(updatedPortals);
    setPortal(updatedPortal);

    toast.success("Portal updated successfully!");
  };

  useEffect(() => {
    const fetchPortal = async () => {
      const fetchedPortal = await OrbitService.instance.getPortal(portalId);
      setPortal(fetchedPortal);
    };

    fetchPortal();
  }, [portalId]);

  return (
    <PortalForm portal={portal} portalTypes={portalTypes} onSubmit={onSubmit} />
  );
}
