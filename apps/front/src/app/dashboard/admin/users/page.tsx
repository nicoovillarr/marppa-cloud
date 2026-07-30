"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AdminGuard } from "@/admin/ui/AdminGuard";
import { UsersAdmin } from "@/admin/ui/UsersAdmin";
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
        id: "users",
        label: "Users",
      },
    ]);
  }, []);

  return (
    <AdminGuard>
      <UsersAdmin />
    </AdminGuard>
  );
}
