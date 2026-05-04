"use client";

import { useDashboardLayout } from "@/dashboard/models/use-dashboard-layout";
import { ZonesList } from "@/mesh/ui/ZonesList";
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
                id: "mesh",
                label: "Mesh",
                href: false,
            },
            {
                id: "zones",
                label: "Zones",
            },
        ]);
    }, []);

    return (
        <ZonesList />
    )
}