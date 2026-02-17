import { create } from "zustand";
import { NodeWithFibers } from "../api/node.api.types";

interface INodeStore {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    error: string | null;
    setError: (error: string | null) => void;

    nodes: NodeWithFibers[];
    setNodes: (nodes: NodeWithFibers[]) => void;
}

export const useNodeStore = create<INodeStore>((set) => ({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => set({ isLoading }),

    error: null,
    setError: (error: string | null) => set({ error }),

    nodes: [],
    setNodes: (nodes: NodeWithFibers[]) => set({ nodes }),
}));