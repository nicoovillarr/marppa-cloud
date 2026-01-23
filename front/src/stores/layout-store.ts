import { BreadcrumbNode } from "@/types/breadcrumb-node";
import { create } from "zustand";

export interface LayoutStore {
  isInitialized: boolean;
  setIsInitialized: (isInitialized: boolean) => void;

  breadcrumbNodes: BreadcrumbNode[];
  setBreadcrumbNodes: (nodes: BreadcrumbNode[]) => void;

  reset: () => void;
}

const defaultState = {
  isInitialized: false,
  breadcrumbNodes: null,
};

export const useLayoutStore = create<LayoutStore>()((set) => ({
  ...defaultState,
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),

  setBreadcrumbNodes: (nodes: BreadcrumbNode[]) =>
    set({ breadcrumbNodes: nodes }),

  reset: () => set({ ...defaultState }),
}));
