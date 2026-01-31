"use client";

import "@/dashboard/mesh/meshFactory";

import { FiberDTO } from "@/libs/types/dto/fiber-dto";
import { useCallback, useEffect, useRef, useState } from "react";
import { MeshService } from "../services/meshService";
import { ColumnMapping } from "@/libs/types/column-mapping";
import Table, { TableHandler } from "@/core/presentation/components/table";
import FormLabel from "@/core/presentation/components/inputs/form/form-label";
import Button from "@/core/presentation/components/button";
import { LuClipboard, LuPlus } from "react-icons/lu";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import { toast } from "sonner";
import FiberForm from "./fiberForm";
import { AsyncTable } from "@/core/presentation/components/AsyncTable";

interface FiberListProps {
  zoneId: string;
  nodeId: string;
}

export default function FibersList({ zoneId, nodeId }: FiberListProps) {
  const { showDialog } = useDialog();

  const [columns, setColumns] = useState<ColumnMapping<FiberDTO>>({});

  const tableRef = useRef<TableHandler>(null);

  const createFiber = async (data: FiberDTO) => {
    const newFiber = await MeshService.instance.createFiber(
      zoneId,
      nodeId,
      data
    );

    // setFibers([...fibers, newFiber]);

    toast.success(`Fiber ${newFiber.id} created`);
    return true;
  };

  const updateFiber = async (fiberId: number, data: FiberDTO) => {
    const updatedFiber = await MeshService.instance.updateFiber(
      zoneId,
      nodeId,
      fiberId,
      data
    );

    // setFibers(
    //   fibers.map((fiber) =>
    //     fiber.id === updatedFiber.id ? updatedFiber : fiber
    //   )
    // );

    toast.success(`Fiber ${updatedFiber.id} updated`);
    return true;
  };

  const openFiberEditor = (fiber?: FiberDTO) => {
    // if (fiber) tableRef.current?.selectRow(fibers.indexOf(fiber));

    const onSubmit = fiber ? () => updateFiber(fiber.id, fiber) : createFiber;

    showDialog({
      title: fiber ? "Edit" : "Create" + " Fiber",
      content: <FiberForm fiber={fiber} onSubmit={onSubmit} />,
      canClose: () => true,
      onClose: () => tableRef.current?.clearSelectedRows(),
    });
  };

  const fetchFibers = useCallback(async () => {
    const response = await MeshService.instance.getFibers(zoneId, nodeId);
    return response;
  }, [zoneId, nodeId]);

  useEffect(() => {
    const cols: ColumnMapping<FiberDTO> = {
      id: { label: "#", minWidth: "100px" },
      hostPort: {
        label: "Host Port",
        width: "150px",
        canCopy: true,
      },
      targetPort: { label: "Target Port", minWidth: "250px", canCopy: true },
      protocol: {
        label: "Protocol",
        minWidth: "150px",
        canCopy: true,
        renderFn: (fiber) => fiber.protocol.toUpperCase(),
      },
      status: { label: "Status", width: "100%", minWidth: "100px" },
    };

    setColumns(cols);
  }, []);

  return (
    <>
      <aside className="flex items-center">
        <FormLabel text="Fibers" className="flex-1" />
        <Button
          className="shrink-0"
          icon={<LuPlus />}
          style="secondary"
          type="button"
          onClick={() => openFiberEditor()}
        />
      </aside>
      <AsyncTable
        fetchData={fetchFibers}
        columns={columns}
        onRowClick={(fiber) => openFiberEditor(fiber)}
      />
    </>
  );
}
