import { create } from "zustand";
import { WorkerFamilyWithRelationsResponseDto } from "../api/worker-family.api.types";

interface IWorkerFamilyStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    families: WorkerFamilyWithRelationsResponseDto[];
    setFamilies: (families: WorkerFamilyWithRelationsResponseDto[]) => void;
}

export const useWorkerFamilyStore = create<IWorkerFamilyStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    families: [],
    setFamilies: (families: WorkerFamilyWithRelationsResponseDto[]) => set({ families }),
}));