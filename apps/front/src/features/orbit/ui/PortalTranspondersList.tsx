"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { FormLabel } from "@/core/ui/inputs/form/FormLabel";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { PortalWithTranspondersWithNodesResponseDto } from "../api/portal.api.types";
import { TransponderForm } from "./TransponderForm";
import { useDialog } from "@/core/ui/DialogProvider";
import { TransponderWithNodeResponseModel } from "../api/transponder.api.type";
import { usePortal } from "../models/use-portal";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { usePortalRealtime } from "../models/use-orbit-realtime";
import { useTransponder } from "../models/use-transponder";
import { useTransponderStore } from "../models/transponder.store";
import { toast } from "sonner";
import { ResourceStatus } from "@/core/models/resource-status.enum";

const DELETABLE_STATUSES: ResourceStatus[] = [
  ResourceStatus.ACTIVE,
  ResourceStatus.FAILED,
];

export function PortalTranspondersList({
  portalId,
}: {
  portalId: string;
}) {
  const { showDialog } = useDialog();

  const {
    fetchPortalById,
  } = usePortal();

  const { deleteTransponder } = useTransponder();

  const [portal, setPortal] = useState<PortalWithTranspondersWithNodesResponseDto | null>(null);

  const [_, setSelectedTransponders] = useState<Set<string>>(
    new Set()
  );

  const refresh = useCallback(() => {
    fetchPortalById(portalId).then((p) => setPortal(p));
  }, [portalId, fetchPortalById]);

  usePortalRealtime(portalId, refresh);

  const onRowClick = (rowData: TransponderWithNodeResponseModel) => {
    showDialog({
      title: `Transponder #${rowData.id}`,
      content: <TransponderForm portalId={portal.id} zoneId={portal.zoneId} transponder={rowData} />,
      canClose: () => true,
      onClose: () => setSelectedTransponders(new Set()),
    });
  };

  const onDeleteTransponder = useCallback((rowData: TransponderWithNodeResponseModel) => {
    showDialog({
      type: "confirm",
      title: "Delete Transponder",
      description:
        "Queue this transponder for removal and regenerate the portal config without it. It must be ACTIVE or FAILED.",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await deleteTransponder(portalId, rowData.id);
        if (ok) {
          toast.success("Transponder deletion queued");
          refresh();
        } else {
          toast.error(
            useTransponderStore.getState().error ??
            "Failed to delete transponder"
          );
        }
      },
    });
  }, [showDialog, portalId, deleteTransponder, refresh]);

  const contextMenu = useCallback(
    (rowData: TransponderWithNodeResponseModel) => [
      {
        label: "Delete",
        color: "red",
        disabled: !DELETABLE_STATUSES.includes(rowData.status),
        action: () => onDeleteTransponder(rowData),
      },
    ],
    [onDeleteTransponder]
  );

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
    status: {
      label: "Status",
      minWidth: "150px",
      renderFn: (value: TransponderWithNodeResponseModel) => (
        <StatusBadge status={value.status} />
      ),
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
    actions: {
      label: "",
      minWidth: "48px",
      onClick: () => false,
      renderFn: (value: TransponderWithNodeResponseModel) => {
        const deletable = DELETABLE_STATUSES.includes(value.status);
        return (
          <button
            type="button"
            className="text-ink-muted transition-colors hover:text-status-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-muted cursor-pointer"
            disabled={!deletable}
            title={
              deletable
                ? "Delete transponder"
                : `Must be ${DELETABLE_STATUSES.join(" or ")} to be deleted (is ${value.status})`
            }
            onClick={() => onDeleteTransponder(value)}
          >
            <LuTrash2 size={16} />
          </button>
        );
      },
    },
  }), [onDeleteTransponder]);

  useEffect(() => {
    refresh();
  }, [portalId]);

  return (
    <>
      <header className="flex justify-between items-center gap-x-4">
        <FormLabel text="Transponders" />
        <button
          className="text-ink-muted hover:text-accent-ink cursor-pointer transition-colors"
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
        contextMenuGroups={contextMenu}
        onRowClick={onRowClick}
        getKey={(portal: TransponderWithNodeResponseModel) => portal.id}
      />
    </>
  );
}
