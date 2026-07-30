"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AdminGuard } from "@/admin/ui/AdminGuard";
import { CompaniesAdmin } from "@/admin/ui/CompaniesAdmin";
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
        id: "companies",
        label: "Companies",
      },
    ]);
  }, []);

  return (
    <AdminGuard>
      <CompaniesAdmin />
    </AdminGuard>
  );
}
