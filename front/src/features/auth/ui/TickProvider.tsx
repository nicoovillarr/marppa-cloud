"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "../models/useAuth";
import { useUser } from "src/features/users/model/useUser";

const INTERVAL_MS = 10 * 60 * 1000;

export function TickProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoggedIn, tick, clear: clearAuth } = useAuth();
    const { me, clear: clearUser } = useUser();

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        const bootstrap = async () => {
            try {
                await tick();

                initializedRef.current = true;
                await me();
            } catch (e) {
                clearUser();
                clearAuth();
            }
        };

        bootstrap();
    }, [tick, me, clearUser, clearAuth]);

    useEffect(() => {
        if (isLoggedIn) {
            if (!initializedRef.current) {
                initializedRef.current = true;
                me();
            }

            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    tick().catch(() => {
                        clearUser();
                        clearAuth();
                    });
                }, INTERVAL_MS);
            }
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            initializedRef.current = false;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isLoggedIn, tick, clearUser, me]);

    return <>{children}</>;
}
