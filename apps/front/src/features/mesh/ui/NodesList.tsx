"use client";

import { useEffect, useState } from "react";
import { FormLabel } from "@/core/ui/inputs/form/FormLabel";
import { ColumnMapping, Table } from "@/core/ui/Table";
import { redirect } from "next/navigation";
import { NodeWithFibers } from "../api/node.api.types";
import { useZone } from "../models/use-zone";
import { ZoneWithNodesAndFibers } from "../api/zone.api.types";
import { TableSkeleton } from "@/core/ui/AsyncTable";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";

const getPointsToInfo = (node: NodeWithFibers) => {
  let pointsTo = "N/A";
  let link = null;

  if (!!node.workerId) {
    pointsTo = `${node.workerId}`;
    link = `/dashboard/hive`;
  } else if (!!node.atomId) {
    pointsTo = `Atom ${node.atomId}`;
    link = `/dashboard/hive/atoms/${node.atomId}`;
  }

  return { pointsTo, link };
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
    renderFn: (node: NodeWithFibers) =>
      Array.isArray(node.fibers) ? node.fibers.length : node.fibers || 0,
  },
  status: { label: "Status", minWidth: 100 },
};

export function NodesList({ zoneId }: { zoneId: string }) {
  const [zone, setZone] = useState<ZoneWithNodesAndFibers | null>(null);

  const {
    fetchZone,
  } = useZone();

  useEffect(() => {
    fetchZone(zoneId).then((zone) => {
      if (zone) {
        setZone(zone);
      }
    });
  }, [zoneId, fetchZone]);

  if (!zone) {
    return <TableSkeleton />;
  }

  return (
    <section className="w-full space-y-2">
      <FormLabel text="Nodes" className="flex-1" />

      <Table
        data={zone?.nodes}
        columns={COLUMNS}
        select="multiple"
        getKey={(node: NodeWithFibers) => node.id}
      />
    </section>
  );
}
