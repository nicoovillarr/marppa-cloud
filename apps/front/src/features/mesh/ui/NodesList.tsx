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
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { ZoneWithNodesAndFibers } from "../api/zone.api.types";
import { TableSkeleton } from "@/core/ui/AsyncTable";
import { closeCurrentDialog, useDialog } from "@/core/ui/DialogProvider";
import { useWebSocket } from "@/core/ui/WebsocketProvider";
import { useUser } from "src/features/users/model/useUser";
import { AssignAtomDialog } from "./AssignAtomDialog";
import { AssignWorkerDialog } from "./AssignWorkerDialog";
import { FiberCreateDialog } from "./FiberCreateDialog";
import { FibersDialog } from "./FibersDialog";
import { StatusBadge } from "@/core/ui/StatusBadge";

const getPointsToInfo = (node: NodeWithFibers) => {
  let pointsTo = "N/A";
  let link = null;

  if (!!node.workerId) {
    pointsTo = `${node.workerId}`;
    link = `/dashboard/hive/workers`;
  } else if (!!node.atomId) {
    pointsTo = `Atom ${node.atomId}`;
    link = `/dashboard/nucleus/atoms`;
  }

  return { pointsTo, link };
};

export function NodesList({ zoneId }: { zoneId: string }) {
  const [zone, setZone] = useState<ZoneWithNodesAndFibers | null>(null);

  const { fetchZone } = useZone();
  const { deleteNode, stopNode, startNode } = useNode();
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

  const openAssignAtomDialog = () => {
    showDialog({
      title: "Assign Atom",
      description: "Reserve an IP in this zone for a container.",
      content: <AssignAtomDialog zoneId={zoneId} onAssigned={refresh} />,
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

  const onStop = (node: NodeWithFibers) => {
    showDialog({
      type: "confirm",
      title: "Stop Node",
      description:
        "Detach the worker's NIC from the zone and release its DHCP reservation. The worker stays assigned and can be started again. Stop its fibers first.",
      confirmText: "Stop",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await stopNode(zoneId, node.id);
        if (ok) {
          toast.success("Node stop queued");
          refresh();
        } else {
          toast.error("Failed to stop node");
        }
      },
    });
  };

  const onStart = async (node: NodeWithFibers) => {
    const ok = await startNode(zoneId, node.id);
    if (ok) {
      toast.success("Node start queued");
      refresh();
    } else {
      toast.error("Failed to start node");
    }
  };

  const onUnassign = (node: NodeWithFibers) => {
    showDialog({
      type: "confirm",
      title: "Unassign Node",
      description: node.atomId
        ? "Release this IP reservation. The atom must be stopped (INACTIVE), or its container would still be holding the address."
        : "Release this IP reservation and detach the worker's NIC from the zone. The worker must be stopped (INACTIVE).",
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
          <span className={link ? "text-amber-ink underline" : ""}>
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
          <span className="text-amber-ink underline">{count} — manage</span>
        );
      },
    },
    status: {
      label: "Status",
      minWidth: 100,
      renderFn: (node: NodeWithFibers) => <StatusBadge status={node.status} />,
    },
  };

  const contextMenuGroups = (node: NodeWithFibers) => {
    // Start/stop materialise a worker's NIC on the bridge. An atom-backed node
    // is only an IP reservation until its container starts, so the backend
    // rejects both for it.
    const isWorkerNode = !!node.workerId;
    const canStart =
      isWorkerNode &&
      (node.status === ResourceStatus.INACTIVE ||
        node.status === ResourceStatus.FAILED);
    const canStop = isWorkerNode && node.status === ResourceStatus.ACTIVE;

    return [
      {
        label: "Manage Fibers",
        action: () => openFibersDialog(node),
      },
      {
        label: "Create Fiber",
        action: () => openCreateFiberDialog(node),
      },
      ...(canStart
        ? [{ label: "Start", action: () => onStart(node) }]
        : []),
      ...(canStop ? [{ label: "Stop", action: () => onStop(node) }] : []),
      {
        label: "Unassign",
        action: () => onUnassign(node),
      },
    ];
  };

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

        <Button
          type="button"
          className="ml-2"
          text="Assign Atom"
          icon={<LuListPlus />}
          style="secondary"
          onClick={openAssignAtomDialog}
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
        <p className="text-sm text-ink-muted">
          No nodes yet. Assign a worker or an atom to reserve its IP in this zone.
        </p>
      )}
    </section>
  );
}
