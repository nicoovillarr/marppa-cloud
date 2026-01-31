"use client";

import { JWT } from "@/libs/types/jwt";
import { createContext, useCallback, useEffect, useState } from "react";

interface AuthContextProps {
  isLoading: boolean;
  accessToken: string | null;
  claims: JWT | null;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<JWT | null>(null);

  const refreshAccessToken = async () => {
    console.log("Refreshing access token");
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      setAccessToken(null);
      return null;
    }

    const newAccessToken = await res.json();
    setAccessToken(newAccessToken);

    return newAccessToken;
  };

  const login = useCallback(
    async (email: string, password: string): Promise<string> => {
      console.log("Logging in user:", email);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const accessToken = await response.json();
      setAccessToken(accessToken);

      return accessToken;
    },
    []
  );

  const logout = useCallback(async () => {
    console.log("Logging out user");
    await fetch("/api/auth/logout", { method: "POST" });
    setAccessToken(null);
  }, []);

  useEffect(() => {
    refreshAccessToken()
      .then(async (r) => {
        if (r == null) {
          console.log("Refresh token invalid, user not logged in.");
          await logout();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setClaims(null);
      return;
    }

    const { exp, userId, companyId, companies } = JSON.parse(
      atob(accessToken.split(".")[1])
    );
    const expiresIn = exp * 1000 - Date.now();

    setClaims({ userId, companyId, companies, exp, token: accessToken });

    const timer = setTimeout(() => refreshAccessToken(), expiresIn - 30 * 1000);
    return () => clearTimeout(timer);
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{ isLoading, accessToken, claims, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
