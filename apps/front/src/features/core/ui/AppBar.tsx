"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/models/useAuth";
import { LuGithub, LuLinkedin, LuMenu, LuX } from "react-icons/lu";
import { useModuleLinks } from "./Sidebar";
import { EXTERNAL_LINKS } from "@/core/models/external-links";

function BrandMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 22 22"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="1.8" className="fill-accent" />
      <ellipse
        cx="11"
        cy="11"
        rx="9.5"
        ry="4"
        className="stroke-accent"
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
  const [menuOpen, setMenuOpen] = useState(false);
  const links = useModuleLinks();
  const router = useRouter();

  const onLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/");
    }
  };

  return (
    <div className="relative h-12 flex items-center justify-between px-4 sm:px-6 bg-sidebar">
      <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMenuOpen(false)}>
        <BrandMark />
        <span className="font-display font-bold text-base tracking-wide text-sidebar-ink-active">
          Marppa
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-4">
        <a
          href={EXTERNAL_LINKS.repository}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-sidebar-ink transition-colors hover:text-sidebar-ink-active"
        >
          <LuGithub className="h-4 w-4" />
          Repository
        </a>
        <a
          href={EXTERNAL_LINKS.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          className="text-sidebar-ink transition-colors hover:text-sidebar-ink-active"
        >
          <LuLinkedin className="h-4 w-4" />
        </a>
        <span className="h-4 w-px bg-sidebar-hover" />
        {isLoggedIn ? (
          <button
            className="text-sm text-sidebar-ink hover:text-sidebar-ink-active transition-colors"
            onClick={onLogout}
          >
            Log out
          </button>
        ) : (
          !isLoading && (
            <Link href="/login" className="text-sm text-sidebar-ink hover:text-sidebar-ink-active transition-colors">
              Log in
            </Link>
          )
        )}
      </div>

      <button
        className="md:hidden shrink-0 text-sidebar-ink-active p-2 -mr-2"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <LuX size={20} /> : <LuMenu size={20} />}
      </button>

      {menuOpen && (
        <nav className="absolute top-12 left-0 right-0 z-40 flex flex-col bg-sidebar shadow-lg md:hidden">
          {isLoggedIn &&
            links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-6 py-3 text-sm border-t border-sidebar-hover text-sidebar-ink"
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          <a
            href={EXTERNAL_LINKS.repository}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-6 py-3 text-sm border-t border-sidebar-hover text-sidebar-ink"
            onClick={() => setMenuOpen(false)}
          >
            <LuGithub className="h-4 w-4 shrink-0" />
            Repository
          </a>
          <a
            href={EXTERNAL_LINKS.linkedin}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-6 py-3 text-sm border-t border-sidebar-hover text-sidebar-ink"
            onClick={() => setMenuOpen(false)}
          >
            <LuLinkedin className="h-4 w-4 shrink-0" />
            LinkedIn
          </a>
          {isLoggedIn ? (
            <button
              className="px-6 py-3 text-sm text-left text-sidebar-ink border-t border-sidebar-hover"
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
                className="px-6 py-3 text-sm text-sidebar-ink border-t border-sidebar-hover"
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
