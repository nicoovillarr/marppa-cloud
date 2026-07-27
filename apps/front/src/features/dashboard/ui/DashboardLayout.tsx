"use client";

import { BreadCrumb } from "@/core/ui/Breadcrumb";
import { Sidebar } from "@/core/ui/Sidebar";
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
    <div className="flex h-full min-h-0">
      <Sidebar />

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto p-4 md:p-8">
          <BreadCrumb />

          {(title || subtitle) && (
            <header className="w-full flex flex-col">
              {title && (
                <h1 className="font-display font-bold text-2xl sm:text-3xl">
                  {title}
                </h1>
              )}
              {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
            </header>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
