import { create } from "zustand";

interface IAuthState {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    isLoggedIn: boolean;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
}

export const useAuthStore = create<IAuthState>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    isLoggedIn: false,
    setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
}))