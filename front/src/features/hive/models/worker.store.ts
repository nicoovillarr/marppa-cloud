import { create } from "zustand";
import { WorkerWithRelationsResponseDto } from "../api/worker.api.types";

interface IWorkerStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    workers: WorkerWithRelationsResponseDto[];
    setWorkers: (workers: WorkerWithRelationsResponseDto[]) => void;
}

export const useWorkerStore = create<IWorkerStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    workers: [],
    setWorkers: (workers: WorkerWithRelationsResponseDto[]) => set({ workers }),
}));