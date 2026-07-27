import { create } from "zustand";
import { AtomWithRelationsResponseDto } from "../api/atom.api.types";

interface IAtomStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    atoms: AtomWithRelationsResponseDto[];
    setAtoms: (atoms: AtomWithRelationsResponseDto[]) => void;
}

export const useAtomStore = create<IAtomStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    atoms: [],
    setAtoms: (atoms: AtomWithRelationsResponseDto[]) => set({ atoms }),
}));
