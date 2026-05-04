"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { DashboardDetails } from "@/dashboard/ui/DashboardDetails";
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
    ]);
  }, []);

  return <DashboardDetails />;
}