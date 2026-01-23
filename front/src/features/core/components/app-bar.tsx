"use client";

import { fetcher } from "@/libs/fetcher";
import { useAppStore } from "@/store/app-store";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useShallow } from "zustand/shallow";

const LoggedInLinks = [{ href: "/dashboard", label: "Dashboard" }];

export default function AppBar() {
  const { user } = useAppStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const onLogout = async () => {
    const response = await fetcher("/api/auth/logout", "POST");
    if (response.success) {
      redirect("/login");
    } else {
      alert(response.data.message || "Logout failed");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 bg-white border-b border-gray-200">
      <Link href="/" className="text-lg font-semibold">
        My App
      </Link>
      <nav className="flex items-center space-x-4">
        {user ? (
          <>
            {LoggedInLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-black"
              >
                {link.label}
              </Link>
            ))}
            <button
              className="text-gray-700 hover:text-black"
              onClick={onLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className="text-gray-700 hover:text-black">
            Login
          </Link>
        )}
      </nav>
    </div>
  );
}
