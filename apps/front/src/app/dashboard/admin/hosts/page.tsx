"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AdminGuard } from "@/admin/ui/AdminGuard";
import { HostsAdmin } from "@/admin/ui/HostsAdmin";
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
        id: "hosts",
        label: "Host capacity",
      },
    ]);
  }, []);

  return (
    <AdminGuard>
      <HostsAdmin />
    </AdminGuard>
  );
}
