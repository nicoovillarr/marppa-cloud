"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { CreateWorkerForm } from "@/hive/ui/CreateWorkerForm";
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
      {
        id: "create",
        label: "Create",
      },
    ]);
  }, []);

  return (
    <CreateWorkerForm />
  );
}

