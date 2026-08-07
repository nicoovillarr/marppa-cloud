"use client";

import { useCallback, useEffect } from "react";
import { useAuth } from "../models/useAuth";
import { useUser } from "src/features/users/model/useUser";

const INTERVAL_MS = 10 * 60 * 1000;

export function TickProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const {
        isLoggedIn,
        tick,
        clear: clearAuth,
    } = useAuth();

    const {
        me,
        clear: clearUser,
    } = useUser();

    const clear = useCallback(() => {
        clearUser();
        clearAuth();
    }, [clearAuth, clearUser]);

    useEffect(() => {
        tick().catch(() => clear());
    }, [tick, clear]);

    useEffect(() => {
        if (!isLoggedIn) return;

        me().catch((e) =>
            console.error("[TickProvider]: Failed to load the current user", e),
        );
    }, [isLoggedIn, me]);

    useEffect(() => {
        if (!isLoggedIn) return;

        const interval = setInterval(() => {
            tick().catch(() => clear());
        }, INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isLoggedIn, tick, clear]);

    return <>{children}</>;
}
