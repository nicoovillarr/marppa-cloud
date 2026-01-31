"use client";

import "@/dashboard/mesh/meshFactory";

import { NodeDTO } from "@/libs/types/dto/node-dto";
import { useCallback, useEffect, useRef, useState } from "react";
import { MeshService } from "../services/meshService";
import { ColumnMapping } from "@/libs/types/column-mapping";
import Link from "next/link";
import FormLabel from "@/core/presentation/components/inputs/form/form-label";
import { LuPlus } from "react-icons/lu";
import { Button } from "@/core/presentation/components/button";
import Table, { TableHandler } from "@/core/presentation/components/table";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import { redirect } from "next/navigation";
import { closeCurrentDialog } from "@/libs/dialog-ref";
import NodeDetails from "./nodeDetails";
import { AsyncTable } from "@/core/presentation/components/AsyncTable";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";

interface NodesListProps {
  zone: ZoneDTO;
  nodes: NodeDTO[];
}

export default function NodesList({ zone, nodes }: NodesListProps) {
  const { showDialog } = useDialog();

  const [columns, setColumns] = useState<ColumnMapping<NodeDTO>>({});

  const tableRef = useRef<TableHandler>(null);

  const updateNode = async (nodeId: string, data: NodeDTO) => {};

  const createNode = async (data: NodeDTO) => {};

  const openNodeEditor = (node: NodeDTO) => {
    // if (node) tableRef.current?.selectRow(nodes.indexOf(node));

    const onSubmit = node ? () => updateNode(node.id, node) : createNode;

    showDialog({
      title: node ? "Edit" : "Create" + " Node",
      content: <NodeDetails node={node} />,
      canClose: () => true,
      onClose: () => tableRef.current?.clearSelectedRows(),
    });
  };

  useEffect(() => {
    const getPointsToInfo = (node: NodeDTO) => {
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

    const cols: ColumnMapping<NodeDTO> = {
      id: { label: "#", width: 175 },
      ipAddress: { label: "IP Address", width: "100%", minWidth: 200 },
      pointsTo: {
        label: "Points To",
        minWidth: 150,
        onClick: (node: NodeDTO) => {
          const { link } = getPointsToInfo(node);
          if (link) {
            closeCurrentDialog();
            redirect(link || "");
          }
        },
        renderFn: (node: NodeDTO) => {
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
        renderFn: (node: NodeDTO) =>
          Array.isArray(node.fibers) ? node.fibers.length : node.fibers || 0,
      },
      status: { label: "Status", minWidth: 100 },
    };

    setColumns(cols);
  }, []);

  return (
    <section className="w-full space-y-2">
      <FormLabel text="Nodes" className="flex-1" />

      <Table
        data={nodes}
        columns={columns}
        onRowClick={(node) => openNodeEditor(node)}
      />
    </section>
  );
}
