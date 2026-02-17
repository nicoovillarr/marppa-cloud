"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { ZoneCreateForm } from "@/mesh/ui/ZoneCreateForm";
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
        id: "create",
        label: "Create",
      },
    ]);
  }, []);

  return (
    <ZoneCreateForm />
  );
}
