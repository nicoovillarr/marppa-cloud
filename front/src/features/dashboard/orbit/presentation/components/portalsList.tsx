"use client";

import Button from "@/core/presentation/components/button";
import Table, {
  ContextMenuGroupGenerator,
  TableHandler,
} from "@/core/presentation/components/table";
import { useAppStore } from "@/libs/stores/app-store";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { useEffect, useRef, useState } from "react";
import { LuListPlus } from "react-icons/lu";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import OrbitService from "../services/orbitService";
import { ResourceStatus } from "@prisma/client";
import PortalDetails from "./portalDetails";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import ReactTimeAgo from "react-timeago";

interface DomainsListProps {
  portalTypes: string[];
}

export default function DomainsList({ portalTypes }: DomainsListProps) {
  const { showDialog } = useDialog();

  const [columns, setColumns] = useState<ColumnMapping<PortalDTO>>({});
  const [contextMenu, setContextMenu] =
    useState<ContextMenuGroupGenerator<PortalDTO>>();
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    new Set()
  );

  const tableRef = useRef<TableHandler>(null);

  const { portals, removePortal } = useAppStore(
    useShallow((state) => ({
      portals: state.portals,
      removePortal: state.removePortal,
    }))
  );

  const selectDomains = (indexes: Set<number>) => {
    const source = Array.from(indexes).map((i) => portals[i].id);
    const set = new Set(source);
    setSelectedDomains(set);
  };

  const deleteSingleDomain = async (portalId: string) => {
    await OrbitService.instance.deletePortals([portalId]);
    removePortal(portalId);
    tableRef.current?.clearSelectedRows();
    toast.success("Portal deleted successfully");
  };

  const onRowClick = (portalId: string) => {
    tableRef.current?.selectRow(
      portals.indexOf(portals.find((w) => w.id === portalId)),
      true
    );

    const portal = portals.find((w) => w.id === portalId);
    if (!portal) {
      toast.error("There was an error fetching the portal.");
      return;
    }

    if (portal.status === ResourceStatus.DELETED) {
      toast.info("This portal has been deleted.");
      return;
    }

    showDialog({
      title: `#${portal.id}`,
      content: <PortalDetails portalId={portal.id} portalTypes={portalTypes} />,
      canClose: () => true,
      onClose: () => tableRef.current?.clearSelectedRows(),
    });
  };

  useEffect(() => {
    const cols: ColumnMapping<PortalDTO> = {
      id: {
        label: "#",
        minWidth: "150px",
      },
      name: {
        label: "Name",
        width: "100%",
        minWidth: "150px",
      },
      address: {
        label: "Address",
        minWidth: "250px",
      },
      status: {
        label: "Status",
        minWidth: "150px",
      },
      lastSyncAt: {
        label: "Last Synced",
        minWidth: "200px",
        renderFn: (value: PortalDTO) => {
          if (!value.lastSyncAt) return "N/A";
          const date = new Date(value.lastSyncAt);
          return <ReactTimeAgo date={date} />;
        },
      },
    };

    const tableContextMenuGroups = (rowData: PortalDTO) => {
      return [
        {
          label: selectedDomains.has(rowData.id) ? "Unselect" : "Select",
          action: () => tableRef.current?.selectRow(portals.indexOf(rowData)),
        },
        {
          label: "Delete",
          color: "red",
          action: () => deleteSingleDomain(rowData.id),
        },
      ];
    };

    setColumns(cols);
    setContextMenu(() => tableContextMenuGroups);
  }, [portals, selectedDomains]);

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Portals
        </h2>
        <Button
          text="Create New"
          icon={<LuListPlus />}
          href="/dashboard/orbit/create"
        />
      </header>

      {portals && portals.length > 0 ? (
        <>
          <Table
            ref={tableRef}
            select="multiple"
            columns={columns}
            data={portals}
            contextMenuGroups={contextMenu}
            onRowClick={(rowData) => onRowClick(rowData.id)}
            onSelectionChange={selectDomains}
          />
          <div className="flex justify-between items-center gap-4 mt-4">
            <p className="text-sm text-gray-600">
              Selected portals:
              <span className="font-bold ml-1">{selectedDomains.size}</span>
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No portals found.</p>
      )}
    </section>
  );
}
