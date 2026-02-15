import { useUserStore } from "./user.store";
import userApi from "../api/user.api";
import { useCallback } from "react";

const useUser = () => {
    const {
        user,
        isLoading,
        error,
        setUser,
        setIsLoading,
        setError,
    } = useUserStore();

    const me = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await userApi.me();
            setUser(data);
        } catch (e) {
            setError(e.message ?? "Unknown error");
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setUser(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        user,
        isLoading,
        error,
        me,
        clear,
    };
}

export default useUser;