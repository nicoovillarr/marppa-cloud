"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

const LoggedInLinks = [{ href: "/dashboard", label: "Dashboard" }];

export default function AppBar() {
  const { accessToken, logout } = useAuth();

  const onLogout = async () => {
    try {
      await logout();
      redirect("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert(error.message || "Logout failed");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 bg-white border-b border-gray-200">
      <Link href="/" className="text-lg font-semibold">
        My App
      </Link>
      <nav className="flex items-center space-x-4">
        {accessToken ? (
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
