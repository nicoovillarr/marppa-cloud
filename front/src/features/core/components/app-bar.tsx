"use client";

import useAuth from "@/auth/models/useAuth";
import Link from "next/link";
import useUser from "src/features/users/model/useUser";

const LoggedInLinks = [{ href: "/dashboard", label: "Dashboard" }];

export default function AppBar() {
  const { user } = useUser();
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-between px-4 bg-white border-b border-gray-200">
      <Link href="/" className="text-lg font-semibold">
        My App
      </Link>

      <nav className="flex items-center space-x-4">
        {!!user ? (
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
              onClick={logout}
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
