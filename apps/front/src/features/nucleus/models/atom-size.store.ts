import { create } from "zustand";
import { AtomSizeResponseDto } from "../api/atom-size.api.types";

interface IAtomSizeStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    sizes: AtomSizeResponseDto[];
    setSizes: (sizes: AtomSizeResponseDto[]) => void;
}

export const useAtomSizeStore = create<IAtomSizeStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    sizes: [],
    setSizes: (sizes: AtomSizeResponseDto[]) => set({ sizes }),
}));
