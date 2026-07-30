"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AdminGuard } from "@/admin/ui/AdminGuard";
import { ResourcesAdmin } from "@/admin/ui/ResourcesAdmin";
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
        id: "admin",
        label: "Admin",
      },
      {
        id: "resources",
        label: "Resources",
      },
    ]);
  }, []);

  return (
    <AdminGuard>
      <ResourcesAdmin />
    </AdminGuard>
  );
}
