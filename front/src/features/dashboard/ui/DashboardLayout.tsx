"use client";

import { BreadCrumb } from "@/core/ui/Breadcrumb";
import { useDashboardLayoutStore } from "@/dashboard/models/dashboard-layout.store";
import { ReactNode } from "react";
import { useShallow } from "zustand/shallow";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { title, subtitle } = useDashboardLayoutStore(
    useShallow((store) => ({
      title: store.title,
      subtitle: store.subtitle,
    }))
  );

  return (
    <main className="flex flex-col gap-8 w-full max-w-[1440px] mx-auto p-4 md:p-8">
      <BreadCrumb />

      {(title || subtitle) && (
        <header className="w-full flex flex-col">
          {title && <h1 className="font-bold text-2xl">{title}</h1>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </header>
      )}

      {children}
    </main>
  );
}
