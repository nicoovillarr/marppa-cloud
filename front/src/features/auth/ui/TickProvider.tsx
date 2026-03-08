"use client";

import { useCallback, useEffect, useRef } from "react";
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

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const initializedRef = useRef(false);

    const clear = useCallback(() => {
        clearUser();
        clearAuth();
    }, [clearAuth, clearUser]);

    useEffect(() => {
        const bootstrap = async () => {
            try {
                await tick();
            } catch (e) {
                clear();
            } finally {
                initializedRef.current = true;
            }
        };

        bootstrap();
    }, [tick, clear]);

    useEffect(() => {
        if (!initializedRef.current) return;

        if (isLoggedIn) {
            me();

            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    tick().catch(() => {
                        clear();
                    });
                }, INTERVAL_MS);
            }
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isLoggedIn, tick, me, clear]);

    return <>{children}</>;
}
