import { WorkerImageResponseDto } from "../api/worker-image.api.types";
import { create } from "zustand";

interface IWorkerImageStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    images: WorkerImageResponseDto[];
    setImages: (images: WorkerImageResponseDto[]) => void;
}

export const useWorkerImageStore = create<IWorkerImageStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    images: [],
    setImages: (images: WorkerImageResponseDto[]) => set({ images }),
}));
