"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import { useAuth } from "@/auth/models/useAuth";
import { LuMenu, LuX } from "react-icons/lu";

const MODULE_LINKS = [
  { href: "/dashboard/hive/workers", label: "Hive" },
  { href: "/dashboard/mesh/zones", label: "Mesh" },
  { href: "/dashboard/nucleus/atoms", label: "Nucleus" },
  { href: "/dashboard/orbit/portals", label: "Orbit" },
];

function BrandMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="1.8" className="fill-amber" />
      <ellipse
        cx="11"
        cy="11"
        rx="9.5"
        ry="4"
        className="stroke-amber"
        strokeWidth="1.2"
      />
      <ellipse
        cx="11"
        cy="11"
        rx="9.5"
        ry="4"
        transform="rotate(60 11 11)"
        className="stroke-ink-muted"
        strokeWidth="1"
      />
    </svg>
  );
}

export function AppBar() {
  const { isLoading, isLoggedIn, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      redirect("/");
    }
  };

  return (
    <div className="relative h-16 flex items-center justify-between px-4 sm:px-6 bg-surface-raised border-b border-border">
      <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMenuOpen(false)}>
        <BrandMark />
        <span className="font-display font-bold text-lg tracking-wide">
          Marppa
        </span>
      </Link>

      {isLoggedIn && (
        <nav className="hidden md:flex items-center gap-1 font-mono text-xs uppercase tracking-wide">
          {MODULE_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href.split("/").slice(0, 3).join("/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-full transition-colors ${active
                  ? "bg-amber-tint text-amber-ink"
                  : "text-ink-muted hover:text-ink"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="hidden md:flex items-center gap-4">
        {isLoggedIn ? (
          <button
            className="text-sm text-ink-muted hover:text-ink transition-colors"
            onClick={onLogout}
          >
            Log out
          </button>
        ) : (
          !isLoading && (
            <Link href="/login" className="text-sm text-ink hover:text-amber-ink transition-colors">
              Log in
            </Link>
          )
        )}
      </div>

      <button
        className="md:hidden shrink-0 text-ink p-2 -mr-2"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <LuX size={22} /> : <LuMenu size={22} />}
      </button>

      {menuOpen && (
        <nav className="absolute top-16 left-0 right-0 z-40 flex flex-col bg-surface-raised border-b border-border shadow-lg md:hidden">
          {isLoggedIn &&
            MODULE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-6 py-3 text-sm border-b border-border text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          {isLoggedIn ? (
            <button
              className="px-6 py-3 text-sm text-left text-ink-muted"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
            >
              Log out
            </button>
          ) : (
            !isLoading && (
              <Link
                href="/login"
                className="px-6 py-3 text-sm text-ink"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
            )
          )}
        </nav>
      )}
    </div>
  );
}
