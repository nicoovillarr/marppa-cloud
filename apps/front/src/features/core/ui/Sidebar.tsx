"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuServer, LuWaypoints, LuBox, LuGlobe } from "react-icons/lu";
import { IconType } from "react-icons";

export const MODULE_LINKS: { href: string; label: string; icon: IconType }[] = [
  { href: "/dashboard/hive/workers", label: "Hive", icon: LuServer },
  { href: "/dashboard/mesh/zones", label: "Mesh", icon: LuWaypoints },
  { href: "/dashboard/nucleus/atoms", label: "Nucleus", icon: LuBox },
  { href: "/dashboard/orbit/portals", label: "Orbit", icon: LuGlobe },
];

export function isModuleActive(pathname: string | null, href: string): boolean {
  return !!pathname?.startsWith(href.split("/").slice(0, 3).join("/"));
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-full bg-sidebar overflow-y-auto">
      <nav className="flex flex-col py-3">
        {MODULE_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isModuleActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 pl-4 pr-3 py-2.5 border-l-[3px] text-sm transition-colors ${
                active
                  ? "border-l-accent bg-sidebar-hover text-sidebar-ink-active font-medium"
                  : "border-l-transparent text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink-active"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
