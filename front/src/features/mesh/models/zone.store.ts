import { create } from "zustand";
import { ZoneWithNodes } from "../api/zone.api.types";

interface IZoneStore {
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;

    error: string | null;
    setError: (value: string | null) => void;

    zones: ZoneWithNodes[];
    setZones: (zones: ZoneWithNodes[]) => void;
}

export const useZoneStore = create<IZoneStore>((set) => ({
    isLoading: false,
    setIsLoading: (value: boolean) => set({ isLoading: value }),

    error: null,
    setError: (value: string | null) => set({ error: value }),

    zones: [],
    setZones: (zones: ZoneWithNodes[]) => set({ zones }),
}));