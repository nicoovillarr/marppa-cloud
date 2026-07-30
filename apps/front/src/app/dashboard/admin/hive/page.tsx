"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AdminGuard } from "@/admin/ui/AdminGuard";
import { HiveCatalogAdmin } from "@/admin/ui/HiveCatalogAdmin";
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
        id: "hive",
        label: "Hive catalog",
      },
    ]);
  }, []);

  return (
    <AdminGuard>
      <HiveCatalogAdmin />
    </AdminGuard>
  );
}
