"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { AtomsList } from "@/nucleus/ui/AtomsList";
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
        id: "nucleus",
        label: "Nucleus",
        href: false,
      },
      {
        id: "atoms",
        label: "Atoms",
      },
    ]);
  }, []);

  return (
    <AtomsList />
  );
}
