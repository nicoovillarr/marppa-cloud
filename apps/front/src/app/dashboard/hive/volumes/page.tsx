"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { VolumesList } from "@/hive/ui/VolumesList";
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
        id: "volumes",
        label: "Volumes",
      },
    ]);
  }, []);

  return (
    <VolumesList />
  );
}
