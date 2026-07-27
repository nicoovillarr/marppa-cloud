"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { CreateAtomForm } from "@/nucleus/ui/CreateAtomForm";
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
      {
        id: "create",
        label: "Create",
      },
    ]);
  }, []);

  return (
    <CreateAtomForm />
  );
}
