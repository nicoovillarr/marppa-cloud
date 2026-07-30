"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AdminGuard } from "@/admin/ui/AdminGuard";
import { AdminOverview } from "@/admin/ui/AdminOverview";
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
    ]);
  }, []);

  return (
    <AdminGuard>
      <AdminOverview />
    </AdminGuard>
  );
}
