"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { FormLabel } from "@/core/ui/inputs/form/FormLabel";
import { LuPlus } from "react-icons/lu";
import { PortalWithTranspondersWithNodesResponseDto } from "../api/portal.api.types";
import { TransponderForm } from "./TransponderForm";
import { useDialog } from "@/core/ui/DialogProvider";
import { TransponderWithNodeResponseModel } from "../api/transponder.api.type";
import { usePortal } from "../models/use-portal";

export function PortalTranspondersList({
  portalId,
}: {
  portalId: string;
}) {
  const { showDialog } = useDialog();

  const {
    fetchPortalById,
  } = usePortal();

  const [portal, setPortal] = useState<PortalWithTranspondersWithNodesResponseDto | null>(null);

  const [_, setSelectedTransponders] = useState<Set<string>>(
    new Set()
  );

  const onRowClick = (rowData: TransponderWithNodeResponseModel) => {
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

  const COLUMNS = useMemo(() => ({
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
    enabled: {
      label: "Enabled",
      minWidth: "150px",
      renderFn: (value: TransponderWithNodeResponseModel) =>
        value.enabled ? "Yes" : "No",
    },
    priority: {
      label: "Priority",
      minWidth: "50px",
    },
    ip: {
      label: "IP",
      minWidth: "200px",
      renderFn: (value: TransponderWithNodeResponseModel) =>
        value.node?.ipAddress || value.nodeId || "N/A",
    },
  }), []);

  useEffect(() => {
    fetchPortalById(portalId).then((p) => setPortal(p));
  }, [portalId]);

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
        data={portal?.transponders ?? []}
        onRowClick={onRowClick}
        getKey={(portal: TransponderWithNodeResponseModel) => portal.id}
      />
    </>
  );
}
