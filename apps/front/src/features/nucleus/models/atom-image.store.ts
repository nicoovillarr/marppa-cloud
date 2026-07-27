import { create } from "zustand";
import { AtomImageResponseDto } from "../api/atom-image.api.types";

interface IAtomImageStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    images: AtomImageResponseDto[];
    setImages: (images: AtomImageResponseDto[]) => void;
}

export const useAtomImageStore = create<IAtomImageStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    images: [],
    setImages: (images: AtomImageResponseDto[]) => set({ images }),
}));
