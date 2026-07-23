import { baseStore, BaseStore } from "@/core/models/base.store";
import { PortalWithTranspondersResponseDto } from "../api/portal.api.types";
import { create } from "zustand";

interface IPortalStore extends BaseStore {
    portalTypes: string[];
    setPortalTypes: (portalTypes: string[]) => void;

    portals: PortalWithTranspondersResponseDto[];
    setPortals: (portals: PortalWithTranspondersResponseDto[]) => void;
}

export const usePortalStore = create<IPortalStore>((set) => ({
    ...baseStore,

    portalTypes: [],
    setPortalTypes: (portalTypes: string[]) => set({ portalTypes }),

    portals: [],
    setPortals: (portals: PortalWithTranspondersResponseDto[]) => set({ portals }),
}));