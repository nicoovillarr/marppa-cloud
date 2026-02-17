"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { CreatePortal } from "@/orbit/ui/CreatePortal";
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
        id: "orbit",
        label: "Orbit",
        href: false,
      },
      {
        id: "portals",
        label: "Portals",
      },
      {
        id: "create",
        label: "Create",
      },
    ]);
  }, []);

  return (
    <CreatePortal />
  );
}
