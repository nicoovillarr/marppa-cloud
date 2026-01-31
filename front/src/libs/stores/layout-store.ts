import { BreadcrumbNode } from "@/libs/types/breadcrumb-node";
import { create } from "zustand";

export interface LayoutStore {
  isInitialized: boolean;
  setIsInitialized: (isInitialized: boolean) => void;

  breadcrumbNodes: BreadcrumbNode[];
  setBreadcrumbNodes: (nodes: BreadcrumbNode[]) => void;

  title: string;
  setTitle: (title: string) => void;

  subtitle: string;
  setSubtitle: (subtitle: string) => void;

  reset: () => void;
}

const defaultState = {
  isInitialized: false,
  breadcrumbNodes: null,
  title: null,
  subtitle: null,
};

export const useLayoutStore = create<LayoutStore>()((set) => ({
  ...defaultState,
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),

  setBreadcrumbNodes: (nodes: BreadcrumbNode[]) =>
    set({ breadcrumbNodes: nodes }),

  setTitle: (title: string) => set({ title }),

  setSubtitle: (subtitle: string) => set({ subtitle }),

  reset: () => set({ ...defaultState }),
}));
