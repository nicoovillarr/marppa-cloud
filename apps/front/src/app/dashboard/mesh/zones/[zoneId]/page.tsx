"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { ZoneDetails } from "@/mesh/ui/ZoneDetails";
import { useEffect } from "react";

export default function Page() {
  const {
    setBreadcrumbNodes
  } = useDashboardLayout();

  useEffect(() => {
    setBreadcrumbNodes([
      {
        id: "dashboard",
        label: "Dashboard",
      },
      {
        id: "mesh",
        label: "Mesh",
        href: false,
      },
      {
        id: "zones",
        label: "Zones",
      },
      {
        id: "zoneId",
        label: "Zone",
      },
    ]);
  }, []);

  return (
    <ZoneDetails />
  );
}
