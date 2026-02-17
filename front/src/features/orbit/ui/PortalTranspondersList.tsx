"use client";

import { useEffect, useState } from "react";
import Table from "@/core/presentation/components/table";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";
import FormLabel from "@/core/presentation/components/inputs/form/form-label";
import { LuPlus } from "react-icons/lu";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import { PortalWithTranspondersResponseDto } from "../api/portal.api.types";
import { TransponderForm } from "./TransponderForm";

interface PortalTranspondersListProps {
  portal: PortalWithTranspondersResponseDto;
}

const COLUMNS: ColumnMapping<TransponderDTO> = {
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

export function PortalTranspondersList({
  portal,
}: PortalTranspondersListProps) {
  const { showDialog } = useDialog();

  const [selectedTransponders, setSelectedTransponders] = useState<Set<string>>(
    new Set()
  );

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
        columns={COLUMNS}
        select="single"
        data={portal.transponders || []}
        onRowClick={onRowClick}
        getKey={(portal: PortalWithTranspondersResponseDto) => portal.id}
      />
    </>
  );
}
