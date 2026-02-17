import { baseStore, BaseStore } from "@/core/models/base.store";
import { PortalWithTranspondersResponseDto } from "../api/portal.api.types";
import { PortalType } from "./portal-type.enum";
import { create } from "zustand";

interface IPortalStore extends BaseStore {
    portalTypes: PortalType[];
    setPortalTypes: (portalTypes: PortalType[]) => void;

    portals: PortalWithTranspondersResponseDto[];
    setPortals: (portals: PortalWithTranspondersResponseDto[]) => void;
}

export const usePortalStore = create<IPortalStore>((set) => ({
    ...baseStore,

    portalTypes: [],
    setPortalTypes: (portalTypes: PortalType[]) => set({ portalTypes }),

    portals: [],
    setPortals: (portals: PortalWithTranspondersResponseDto[]) => set({ portals }),
}));