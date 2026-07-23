"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormLabel } from "@/core/ui/inputs/form/FormLabel";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { redirect } from "next/navigation";
import { LuListPlus, LuRefreshCcw } from "react-icons/lu";
import { Button } from "@/core/ui/Button";
import { NodeWithFibers } from "../api/node.api.types";
import { useZone } from "../models/use-zone";
import { useNode } from "../models/use-node";
import { ZoneWithNodesAndFibers } from "../api/zone.api.types";
import { TableSkeleton } from "@/core/ui/AsyncTable";
import { closeCurrentDialog, useDialog } from "@/core/ui/DialogProvider";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { useUser } from "src/features/users/model/useUser";
import { AssignWorkerDialog } from "./AssignWorkerDialog";
import { FiberCreateDialog } from "./FiberCreateDialog";
import { FibersDialog } from "./FibersDialog";

const getPointsToInfo = (node: NodeWithFibers) => {
  let pointsTo = "N/A";
  let link = null;

  if (!!node.workerId) {
    pointsTo = `${node.workerId}`;
    link = `/dashboard/hive/workers`;
  } else if (!!node.atomId) {
    pointsTo = `Atom ${node.atomId}`;
    link = `/dashboard/hive/atoms/${node.atomId}`;
  }

  return { pointsTo, link };
};

export function NodesList({ zoneId }: { zoneId: string }) {
  const [zone, setZone] = useState<ZoneWithNodesAndFibers | null>(null);

  const { fetchZone } = useZone();
  const { deleteNode } = useNode();
  const { showDialog } = useDialog();
  const { subscribe } = useWebSocket();
  const { user } = useUser();

  const refresh = useCallback(() => {
    fetchZone(zoneId).then((zone) => {
      if (zone) {
        setZone(zone);
      }
    });
  }, [zoneId, fetchZone]);

  const openAssignWorkerDialog = () => {
    showDialog({
      title: "Assign Worker",
      description: "Reserve an IP in this zone and attach the worker to it.",
      content: <AssignWorkerDialog zoneId={zoneId} onAssigned={refresh} />,
    });
  };

  const openCreateFiberDialog = (node: NodeWithFibers) => {
    showDialog({
      title: `Create Fiber on ${node.ipAddress}`,
      content: (
        <FiberCreateDialog zoneId={zoneId} nodeId={node.id} onCreated={refresh} />
      ),
    });
  };

  const openFibersDialog = (node: NodeWithFibers) => {
    showDialog({
      title: `Fibers — ${node.ipAddress}`,
      content: (
        <FibersDialog
          zoneId={zoneId}
          nodeId={node.id}
          nodeIp={node.ipAddress}
          onChanged={refresh}
        />
      ),
    });
  };

  const onUnassign = (node: NodeWithFibers) => {
    showDialog({
      type: "confirm",
      title: "Unassign Node",
      description:
        "Release this IP reservation and detach the worker's NIC from the zone. The worker must be stopped (INACTIVE).",
      confirmText: "Unassign",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await deleteNode(zoneId, node.id);
        if (ok) {
          toast.success("Node unassignment queued");
          refresh();
        } else {
          toast.error("Failed to unassign node");
        }
      },
    });
  };

  const COLUMNS: ColumnMapping<NodeWithFibers> = {
    id: { label: "#", width: 175 },
    ipAddress: { label: "IP Address", width: "100%", minWidth: 200 },
    pointsTo: {
      label: "Points To",
      minWidth: 150,
      onClick: (node: NodeWithFibers) => {
        const { link } = getPointsToInfo(node);
        if (link) {
          closeCurrentDialog();
          redirect(link || "");
        }
      },
      renderFn: (node: NodeWithFibers) => {
        const { pointsTo, link } = getPointsToInfo(node);

        return (
          <span className={link ? "text-blue-500 underline" : ""}>
            {pointsTo}
          </span>
        );
      },
    },
    fibersCount: {
      label: "Fibers",
      minWidth: 100,
      onClick: (node: NodeWithFibers) => openFibersDialog(node),
      renderFn: (node: NodeWithFibers) => {
        const count = Array.isArray(node.fibers)
          ? node.fibers.length
          : node.fibers || 0;
        return (
          <span className="text-blue-500 underline">{count} — manage</span>
        );
      },
    },
    status: { label: "Status", minWidth: 100 },
  };

  const contextMenuGroups = (node: NodeWithFibers) => [
    {
      label: "Manage Fibers",
      action: () => openFibersDialog(node),
    },
    {
      label: "Create Fiber",
      action: () => openCreateFiberDialog(node),
    },
    {
      label: "Unassign",
      action: () => onUnassign(node),
    },
  ];

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const companyId = user?.companyId;
    if (!companyId) return;

    const unsubscribe = subscribe(`company:${companyId}:mesh`, (message) => {
      const payload = message?.data ?? {};

      if (payload.zoneId === zoneId || payload.nodeId) {
        refresh();
      }
    });

    return unsubscribe;
  }, [user?.companyId, subscribe, zoneId, refresh]);

  if (!zone) {
    return <TableSkeleton />;
  }

  return (
    <section className="w-full space-y-2">
      <header className="flex justify-between items-center">
        <FormLabel text="Nodes" className="flex-1" />

        <Button
          type="button"
          icon={<LuRefreshCcw />}
          style="secondary"
          onClick={refresh}
        />

        <Button
          type="button"
          className="ml-2"
          text="Assign Worker"
          icon={<LuListPlus />}
          onClick={openAssignWorkerDialog}
        />
      </header>

      {zone.nodes.length > 0 ? (
        <Table
          data={zone.nodes}
          columns={COLUMNS}
          select="multiple"
          contextMenuGroups={contextMenuGroups}
          getKey={(node: NodeWithFibers) => node.id}
        />
      ) : (
        <p className="text-sm text-gray-500">
          No nodes yet. Assign a worker to reserve its IP in this zone.
        </p>
      )}
    </section>
  );
}
