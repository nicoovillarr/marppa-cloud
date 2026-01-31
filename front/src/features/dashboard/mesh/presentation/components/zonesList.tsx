"use client";

import "@/dashboard/mesh/meshFactory";

import BreadCrumb from "@/core/presentation/components/breadcrumb";
import Button from "@/core/presentation/components/button";
import Table from "@/core/presentation/components/table";
import { useAppStore } from "@/libs/stores/app-store";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { NodeDTO } from "@/libs/types/dto/node-dto";
import { useEffect, useState } from "react";
import { LuListPlus } from "react-icons/lu";
import { useShallow } from "zustand/shallow";
import { MeshService } from "../services/meshService";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { toast } from "sonner";
import { ResourceStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { useAuth } from "@/core/presentation/hooks/use-auth";
import { useWebSocket } from "@/core/presentation/hooks/use-webSocket";

export default function InstancesList() {
  const { claims } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();

  const [selectedzones, setSelectedZones] = useState<Set<string>>(new Set());

  const { user, zones, setZones } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      zones: state.zones,
      setZones: state.setZones,
    }))
  );

  const selectZone = (zoneId: string, reset: boolean = false) => {
    const newSelectedZones = new Set(reset ? [] : Array.from(selectedzones));
    if (selectedzones.has(zoneId)) {
      newSelectedZones.delete(zoneId);
    } else {
      newSelectedZones.add(zoneId);
    }
    setSelectedZones(newSelectedZones);
  };

  const deleteSingleZone = async (zoneId: string) => {
    const response = await MeshService.instance.deleteZones([zoneId]);
    setZones(zones.filter((zone) => zone.id !== zoneId));
    setSelectedZones((prev) => {
      const newSelected = new Set(prev);
      newSelected.delete(zoneId);
      return newSelected;
    });

    toast.success("Zone deleted successfully");
  };

  const onRowClick = (zoneId: string) => {
    selectZone(zoneId, true);

    const zone = zones.find((w) => w.id === zoneId);
    if (!zone) {
      toast.error("There was an error fetching the zone.");
      return;
    }

    if (zone.status === ResourceStatus.DELETED) {
      toast.info("This zone has been deleted.");
      return;
    }

    redirect(`/dashboard/mesh/zones/${zoneId}`);
  };

  const tableContextMenuGroups = (rowData: ZoneDTO) => [
    {
      label: selectedzones.has(rowData.id) ? "Unselect" : "Select",
      action: () => selectZone(rowData.id),
    },
    {
      label: "Delete",
      color: "red",
      action: () => deleteSingleZone(rowData.id),
    },
  ];

  const columns: ColumnMapping<ZoneDTO> = {
    actions: {
      label: "",
      width: "25px",
      minWidth: "25px",
      onClick: (value: ZoneDTO) => selectZone(value.id),
      renderFn: (value: ZoneDTO) => (
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={selectedzones.has(value.id)}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onChange={() => selectZone(value.id)}
        />
      ),
    },
    id: {
      label: "#",
      width: "125px",
    },
    name: {
      label: "Name",
      width: "100%",
      minWidth: "150px",
    },
    status: {
      label: "Status",
      width: "150px",
      renderFn: (value: ZoneDTO) => (
        <span className={`status-${value.status.toLowerCase()}`}>
          {value.status}
        </span>
      ),
    },
    cidr: {
      label: "CIDR",
      width: "150px",
    },
    gateway: {
      label: "Gateway",
      width: "150px",
    },
    usedIPs: {
      label: "Used IPs",
      width: "125px",
      renderFn: (value: ZoneDTO) => value.nodes?.length || "0",
    },
    createdAt: {
      label: "Created At",
      width: "200px",
      renderFn: (value: ZoneDTO) =>
        new Date(value.createdAt).toLocaleDateString(),
    },
  };

  const broadcastHandler = (type: string, data: any) => {
    const { zones: oldZones, setZones } = useAppStore.getState();

    switch (type) {
      case "UPDATED":
        const { zoneId, data: zoneData } = data;

        const newZonesList = oldZones.map((z) =>
          z.id === zoneId ? { ...z, ...zoneData } : z
        );

        console.log(
          "Zone updated via WebSocket:",
          newZonesList.find((z) => z.id === zoneId)
        );

        setZones(newZonesList);
        break;
    }
  };

  useEffect(() => {
    if (!claims) return;

    const keys = claims.companies.map((c) => `company:${c}:mesh`);
    for (const key of keys) {
      subscribe(key, (message) => {
        const { type, data } = message;
        broadcastHandler(type, data);
      });
    }

    return () => {
      for (const key of keys) {
        unsubscribe(key);
      }
    };
  }, [user, claims]);

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Zones
        </h2>
        <Button
          text="Create New"
          icon={<LuListPlus />}
          href="/dashboard/mesh/create"
        />
      </header>
      {zones && zones.length > 0 ? (
        <>
          <Table
            columns={columns}
            data={zones}
            contextMenuGroups={tableContextMenuGroups}
            rowHref={(rowData) => `/dashboard/mesh/zones/${rowData.id}`}
          />
          <div className="flex justify-between items-center gap-4 mt-4">
            <p className="text-sm text-gray-600">
              Selected zones:
              <span className="font-bold ml-1">{selectedzones.size}</span>
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No zones found.</p>
      )}
    </section>
  );
}
