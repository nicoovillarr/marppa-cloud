"use client";

import Button from "@/core/presentation/components/button";
import Table, {
  TableHandler,
} from "@/core/presentation/components/table";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuListPlus } from "react-icons/lu";
import { toast } from "sonner";
import { PortalDetails } from "./PortalDetails";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import ReactTimeAgo from "react-timeago";
import { usePortal } from "../models/use-portal";
import { PortalWithTranspondersResponseDto } from "../api/portal.api.types";
import { ResourceStatus } from "@/core/models/resource-status.enum";

const COLUMNS: ColumnMapping<PortalWithTranspondersResponseDto> = {
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
    renderFn: (value: PortalWithTranspondersResponseDto) => {
      if (!value.lastSyncAt) return "N/A";
      const date = new Date(value.lastSyncAt);
      return <ReactTimeAgo date={date} />;
    },
  },
};

export function PortalsList() {
  const { showDialog } = useDialog();

  const {
    portalTypes,
    fetchPortalTypes,
    portals,
    fetchPortals,
    deletePortal,
  } = usePortal();

  const [selectedPortals, setSelectedPortals] = useState<Set<string>>(
    new Set()
  );

  const tableRef = useRef<TableHandler<string>>(null);

  const selectDomains = (indexes: Set<string>) => {
    const source = Array.from(indexes)
      .map((i) => portals.find(w => w.id === i)?.id)
      .filter((id) => id !== null);
    const set = new Set(source);
    setSelectedPortals(set);
  };

  const deleteSingleDomain = async (portalId: string) => {
    deletePortal(portalId);
    tableRef.current?.clearSelectedRows();
    toast.success("Portal deleted successfully");
  };

  const onRowClick = (portalId: string) => {
    tableRef.current?.selectRow(
      portalId,
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

  const contextMenu = useCallback((rowData: PortalWithTranspondersResponseDto) => {
    return [
      {
        label: selectedPortals.has(rowData.id) ? "Unselect" : "Select",
        action: () => tableRef.current?.selectRow(rowData.id),
      },
      {
        label: "Delete",
        color: "red",
        action: () => deleteSingleDomain(rowData.id),
      },
    ];
  }, [tableRef, deleteSingleDomain]);

  useEffect(() => {
    fetchPortalTypes();
    fetchPortals();
  }, [selectedPortals]);

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Portals
        </h2>
        <Button
          text="Create New"
          icon={<LuListPlus />}
          href="/dashboard/orbit/portals/create"
        />
      </header>

      {portals && portals.length > 0 ? (
        <>
          <Table
            ref={tableRef}
            select="multiple"
            columns={COLUMNS}
            data={portals}
            contextMenuGroups={contextMenu}
            onRowClick={(rowData) => onRowClick(rowData.id)}
            onSelectionChange={selectDomains}
            getKey={(rowData: PortalWithTranspondersResponseDto) => rowData.id}
          />
          <div className="flex justify-between items-center gap-4 mt-4">
            <p className="text-sm text-gray-600">
              Selected portals:
              <span className="font-bold ml-1">{selectedPortals.size}</span>
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No portals found.</p>
      )}
    </section>
  );
}
