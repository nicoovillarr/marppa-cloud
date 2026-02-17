"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { WorkersList } from "@/hive/ui/WorkersList";
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
        id: "hive",
        label: "Hive",
        href: false,
      },
      {
        id: "workers",
        label: "Workers",
      },
    ]);
  }, []);

  return (
    <WorkersList />
  );
}


