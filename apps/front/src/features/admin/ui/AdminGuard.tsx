"use client";

import { Callout } from "@/core/ui/Callout";
import { useUser } from "@/users/model/useUser";
import { ReactNode } from "react";
import { LuShieldAlert } from "react-icons/lu";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading || !user) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  if (!user.isPlatformAdmin) {
    return (
      <Callout
        icon={<LuShieldAlert />}
        text="Platform administrators only. This section manages catalog and tenant data shared by every company."
      />
    );
  }

  return <>{children}</>;
}
