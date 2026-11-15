"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { DnsApiKeysList } from "@/orbit/ui/DnsApiKeysList";
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
        id: "orbit",
        label: "Orbit",
        href: false,
      },
      {
        id: "dns-api-keys",
        label: "API Keys",
      },
    ]);
  }, []);

  return (
    <DnsApiKeysList />
  );
}
