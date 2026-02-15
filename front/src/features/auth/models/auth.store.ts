import { create } from "zustand";

interface IAuthState {
    refreshToken: string | null;
    accessToken: string | null;
    isLoading: boolean;
    error: string | null;

    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setAuth: ({ refreshToken, accessToken }: { refreshToken: string; accessToken: string } | null) => void;
}

export const useAuthStore = create<IAuthState>((set) => ({
    refreshToken: null,
    accessToken: null,
    isLoading: false,
    error: null,

    setIsLoading: (isLoading) => {
        set({ isLoading });
    },

    setError: (error: string | null) => {
        set({ error });
    },

    setAuth: (data: { refreshToken: string; accessToken: string } | null) => {
        if (!!data) {
            const { refreshToken, accessToken } = data;
            set({ refreshToken, accessToken });
        } else {
            set({ refreshToken: null, accessToken: null });
        }
    },
}))