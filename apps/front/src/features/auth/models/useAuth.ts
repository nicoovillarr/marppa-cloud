import { useCallback } from "react";
import { authService } from "../services/auth.service";
import { useAuthStore } from "./auth.store";

export const useAuth = () => {
    const {
        isLoading,
        setIsLoading,
        error,
        setError,
        isLoggedIn,
        setIsLoggedIn,
    } = useAuthStore();

    const tick = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        let result = false;

        try {
            result = await authService.tick();
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
            setIsLoggedIn(result);
        }

        return result;
    }, []);

    const login = useCallback(async (email: string, password: string, captchaToken?: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        setIsLoggedIn(false);

        let result = false;

        try {
            result = await authService.login({ email, password, captchaToken });
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
            setIsLoggedIn(result);
        }

        return result;
    }, []);

    const register = useCallback(async (email: string, password: string, name: string, captchaToken?: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        setIsLoggedIn(false);

        let result = false;

        try {
            result = await authService.register({
                email,
                password,
                name,
                captchaToken,
            });
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
            setIsLoggedIn(result);
        }

        return result;
    }, []);

    const requestPasswordReset = useCallback(async (email: string, captchaToken?: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.requestPasswordReset({ email, captchaToken });
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const confirmPasswordReset = useCallback(async (token: string, newPassword: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.confirmPasswordReset({ token, newPassword });
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setError(null);
        setIsLoading(false);
        setIsLoggedIn(false);
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
        isLoading,
        error,
        isLoggedIn,
        tick,
        login,
        register,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        clear,
    };
}
