"use client";

import { useEffect } from "react";
import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AtomVolumesList } from "@/nucleus/ui/AtomVolumesList";

export default function Page() {
  const { setBreadcrumbNodes } = useDashboardLayout();

  useEffect(() => {
    setBreadcrumbNodes([
      {
        id: "dashboard",
        label: "Dashboard",
      },
      {
        id: "nucleus",
        label: "Nucleus",
        href: false,
      },
      {
        id: "volumes",
        label: "Volumes",
      },
    ]);
  }, []);

  return <AtomVolumesList />;
}
