"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuServer, LuWaypoints, LuBox, LuGlobe, LuShieldCheck } from "react-icons/lu";
import { IconType } from "react-icons";
import { useUser } from "src/features/users/model/useUser";

export const MODULE_LINKS: { href: string; label: string; icon: IconType }[] = [
  { href: "/dashboard/hive/workers", label: "Hive", icon: LuServer },
  { href: "/dashboard/mesh/zones", label: "Mesh", icon: LuWaypoints },
  { href: "/dashboard/nucleus/atoms", label: "Nucleus", icon: LuBox },
  { href: "/dashboard/orbit/portals", label: "Orbit", icon: LuGlobe },
];

export const ADMIN_LINK = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: LuShieldCheck,
};

export function useModuleLinks() {
  const { user } = useUser();

  return user?.isPlatformAdmin ? [...MODULE_LINKS, ADMIN_LINK] : MODULE_LINKS;
}

export function isModuleActive(pathname: string | null, href: string): boolean {
  return !!pathname?.startsWith(href.split("/").slice(0, 3).join("/"));
}

export function Sidebar() {
  const pathname = usePathname();
  const links = useModuleLinks();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-full bg-sidebar overflow-y-auto">
      <nav className="flex flex-col py-3">
        {links.map(({ href, label, icon: Icon }) => {
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
