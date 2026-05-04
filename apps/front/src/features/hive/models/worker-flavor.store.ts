import { create } from "zustand";
import { WorkerFlavorResponseDto } from "../api/worker-flavor.api.types";

interface IWorkerFlavorStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    flavors: WorkerFlavorResponseDto[];
    setFlavors: (flavors: WorkerFlavorResponseDto[]) => void;
}

export const useWorkerFlavorStore = create<IWorkerFlavorStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    flavors: [],
    setFlavors: (flavors: WorkerFlavorResponseDto[]) => set({ flavors }),
}));