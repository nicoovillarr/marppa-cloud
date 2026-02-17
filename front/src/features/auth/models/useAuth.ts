import { useCallback } from "react";
import { authService } from "../services/auth.service";
import { useAuthStore } from "./auth.store";

export const useAuth = () => {
    const {
        refreshToken,
        accessToken,
        isLoading,
        error,
        setAuth,
        setIsLoading,
        setError,
    } = useAuthStore();

    const isLoggedIn = !!refreshToken && !!accessToken;

    const tick = useCallback(async (): Promise<void> => {
        setIsLoading(false);
        setError(null);

        try {
            const data = await authService.tick();
            setAuth(data);
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await authService.login({ email, password });
            setAuth(data);
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(async (email: string, password: string, firstName: string, lastName?: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await authService.register({
                email,
                password,
                firstName,
                lastName,
            });
            setAuth(data);
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setAuth(null);
        setError(null);
        setIsLoading(false);
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.logout();
        } catch (e) {
            console.error(e.message ?? "Could not invalidate your session. Logging out anyway");
        } finally {
            clear();
        }
    }, [clear]);

    return {
        refreshToken,
        accessToken,
        isLoggedIn,
        isLoading,
        error,
        tick,
        login,
        register,
        logout,
        clear,
    };
}
