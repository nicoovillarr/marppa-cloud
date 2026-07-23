import { create } from "zustand";

export interface BreadcrumbNode {
  id: string;
  label: string;
  href?: string | boolean;
}

interface DashboardLayoutStore {
  breadcrumbNodes: BreadcrumbNode[];
  setBreadcrumbNodes: (nodes: BreadcrumbNode[]) => void;

  title: string;
  setTitle: (title: string) => void;

  subtitle: string;
  setSubtitle: (subtitle: string) => void;

  reset: () => void;
}

const defaultState = {
  breadcrumbNodes: [],
  title: null,
  subtitle: null,
};

export const useDashboardLayoutStore = create<DashboardLayoutStore>()((set) => ({
  ...defaultState,

  setBreadcrumbNodes: (nodes: BreadcrumbNode[]) =>
    set({ breadcrumbNodes: nodes }),

  setTitle: (title: string) => set({ title }),

  setSubtitle: (subtitle: string) => set({ subtitle }),

  reset: () => set({ ...defaultState }),
}));
