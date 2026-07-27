"use client";

import { Button } from "@/core/ui/Button";
import { Table } from "@/core/ui/Table";
import { useEffect } from "react";
import { toast } from "sonner";
import { LuListPlus } from "react-icons/lu";
import { useZone } from "../models/use-zone";
import { useMeshRealtime } from "../models/use-mesh-realtime";
import { useDialog } from "@/core/ui/DialogProvider";
import { ResourceStatus } from "@/core/models/resource-status.enum";
import { ZoneWithNodes } from "../api/zone.api.types";
import { StatusBadge } from "@/core/ui/StatusBadge";

const COLUMNS = {
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
    renderFn: (value: ZoneWithNodes) => <StatusBadge status={value.status} />,
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
    renderFn: (value: ZoneWithNodes) => value.nodes?.length || "0",
  },
  createdAt: {
    label: "Created At",
    width: "200px",
    renderFn: (value: ZoneWithNodes) =>
      new Date(value.createdAt).toLocaleDateString(),
  },
};

export function ZonesList() {
  const {
    zones,
    fetchZones,
    stopZone,
    startZone,
  } = useZone();

  const { showDialog } = useDialog();

  useMeshRealtime();

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const onStart = async (zone: ZoneWithNodes) => {
    const ok = await startZone(zone.id);
    if (ok) {
      toast.success("Zone start queued");
      fetchZones();
    } else {
      toast.error("Failed to start zone");
    }
  };

  const onStop = (zone: ZoneWithNodes) => {
    showDialog({
      type: "confirm",
      title: "Stop Zone",
      description:
        "Tear down the zone's bridge, DHCP and firewall rules. The zone can be started again. Stop its nodes first.",
      confirmText: "Stop",
      confirmButtonStyle: "danger",
      onConfirm: async () => {
        const ok = await stopZone(zone.id);
        if (ok) {
          toast.success("Zone stop queued");
          fetchZones();
        } else {
          toast.error("Failed to stop zone");
        }
      },
    });
  };

  const contextMenuGroups = (zone: ZoneWithNodes) => {
    const canStart =
      zone.status === ResourceStatus.INACTIVE ||
      zone.status === ResourceStatus.FAILED;
    const canStop = zone.status === ResourceStatus.ACTIVE;

    return [
      ...(canStart ? [{ label: "Start", action: () => onStart(zone) }] : []),
      ...(canStop ? [{ label: "Stop", action: () => onStop(zone) }] : []),
    ];
  };

  return (
    <section>
      <header className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl w-full text-ellipsis line-clamp-1">
          Your Zones
        </h2>
        <Button
          text="Create New"
          icon={<LuListPlus />}
          href="/dashboard/mesh/zones/create"
        />
      </header>
      {zones && zones.length > 0 ? (
        <>
          <Table
            columns={COLUMNS}
            data={zones}
            rowHref={(rowData: ZoneWithNodes) => `/dashboard/mesh/zones/${rowData.id}`}
            getKey={(rowData: ZoneWithNodes) => rowData.id}
            contextMenuGroups={contextMenuGroups}
          />
        </>
      ) : (
        <p className="text-sm text-ink-muted">No zones found.</p>
      )}
    </section>
  );
}
