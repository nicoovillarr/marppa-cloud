"use client";


import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { useEffect, useState } from "react";
import OrbitService from "../services/orbitService";
import { useAppStore } from "@/libs/stores/app-store";
import { useShallow } from "zustand/shallow";
import Table from "@/core/presentation/components/table";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";
import FormLabel from "@/core/presentation/components/inputs/form/form-label";
import { LuPlus } from "react-icons/lu";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import { TransponderForm } from "./transponderForm";

interface PortalTranspondersListProps {
  portal: PortalDTO;
}

export function PortalTranspondersList({
  portal,
}: PortalTranspondersListProps) {
  const { showDialog } = useDialog();

  const [selectedTransponders, setSelectedTransponders] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);

  const { portals, setPortals } = useAppStore(
    useShallow((state) => ({
      portals: state.portals,
      setPortals: state.setPortals,
    }))
  );

  const selectTransponder = (transponderId: string, reset: boolean = false) => {
    const newSelectedTransponders = new Set(
      reset ? [] : Array.from(selectedTransponders)
    );

    if (newSelectedTransponders.has(transponderId)) {
      newSelectedTransponders.delete(transponderId);
    } else {
      newSelectedTransponders.add(transponderId);
    }

    setSelectedTransponders(newSelectedTransponders);
  };

  const columns: ColumnMapping<TransponderDTO> = {
    // actions: {
    //   label: "",
    //   width: "25px",
    //   minWidth: "25px",
    //   onClick: (value: TransponderDTO) => selectTransponder(value.id),
    //   renderFn: (value: TransponderDTO) => (
    //     <input
    //       type="checkbox"
    //       className="cursor-pointer"
    //       checked={selectedTransponders.has(value.id)}
    //       onClick={(e) => {
    //         e.stopPropagation();
    //         e.preventDefault();
    //       }}
    //       onChange={() => selectTransponder(value.id)}
    //     />
    //   ),
    // },
    id: {
      label: "#",
      minWidth: "150px",
    },
    path: {
      label: "Path",
      width: "100%",
      minWidth: "100px",
    },
    mode: {
      label: "Mode",
      minWidth: "150px",
    },
    priority: {
      label: "Priority",
      minWidth: "50px",
    },
    enabled: {
      label: "Enabled",
      minWidth: "50px",
      renderFn: (value: TransponderDTO) => (value.enabled ? "Yes" : "No"),
    },
    ip: {
      label: "IP",
      minWidth: "200px",
      renderFn: (value: TransponderDTO) =>
        value.node?.ipAddress || value.nodeId || "N/A",
    },
  };

  const onRowClick = (rowData: TransponderDTO) => {
    showDialog({
      title: `Transponder #${rowData.id}`,
      content: <TransponderForm portalId={portal.id} zoneId={portal.zoneId} transponder={rowData} />,
      canClose: () => true,
      onClose: () => setSelectedTransponders(new Set()),
    });
  };

  const onAddTransponder = () => {
    showDialog({
      title: `Add Transponder`,
      content: <TransponderForm portalId={portal.id} zoneId={portal.zoneId} />,
      canClose: () => true,
      onClose: () => setSelectedTransponders(new Set()),
    });
  };

  useEffect(() => {
    if (loading) return;
    setLoading(true);

    const fetchPortal = async () => {
      const response = await OrbitService.instance.getPortal(portal.id);
      setPortals(portals.map((p) => (p.id === response?.id ? response : p)));
    };

    fetchPortal().then(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="flex justify-between items-center gap-x-4">
        <FormLabel text="Transponders" />
        <button
          className="text-gray-600 hover:text-black cursor-pointer transition-colors"
          onClick={onAddTransponder}
          type="button"
        >
          <LuPlus size={16} />
        </button>
      </header>

      <Table
        columns={columns}
        select="single"
        data={portal.transponders || []}
        onRowClick={onRowClick}
      />
    </>
  );
}
