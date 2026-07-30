"use client";

import { Card } from "@/core/ui/Card";
import Link from "next/link";
import { ADMIN_SECTIONS } from "../models/admin-sections";

export function AdminOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ADMIN_SECTIONS.map(({ href, label, description, icon }) => (
        <Link key={href} href={href} className="group">
          <Card
            className="h-full transition-colors group-hover:border-accent"
            icon={icon}
            title={label}
          >
            <p className="text-sm text-ink-muted">{description}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
