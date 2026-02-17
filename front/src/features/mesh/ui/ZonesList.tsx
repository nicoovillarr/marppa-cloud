"use client";

import Button from "@/core/presentation/components/button";
import Table from "@/core/presentation/components/table";
import { useAppStore } from "@/libs/stores/app-store";
import { useEffect, useMemo, useState } from "react";
import { LuListPlus } from "react-icons/lu";
import { useShallow } from "zustand/shallow";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { toast } from "sonner";
import { redirect } from "next/navigation";
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
