import { create } from "zustand";
import { User } from "./user.types";

interface IUserStore {
    user: User | null;
    isLoading: boolean;
    error: string | null;

    setUser: (user: User) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string) => void;
}

export const useUserStore = create<IUserStore>((set) => ({
    user: null,
    isLoading: false,
    error: null,

    setUser: (user: User) => set({ user }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
    setError: (error: string) => set({ error }),
}));