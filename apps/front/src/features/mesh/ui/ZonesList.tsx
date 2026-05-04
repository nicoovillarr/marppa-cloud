"use client";

import { Button } from "@/core/ui/Button";
import { Table } from "@/core/ui/Table";
import { useEffect } from "react";
import { LuListPlus } from "react-icons/lu";
import { useZone } from "../models/use-zone";
import { ZoneWithNodes } from "../api/zone.api.types";

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
    renderFn: (value: ZoneWithNodes) => (
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
  } = useZone();

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

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
          />
        </>
      ) : (
        <p className="text-sm text-gray-500">No zones found.</p>
      )}
    </section>
  );
}
