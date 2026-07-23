import { baseStore, BaseStore } from "@/core/models/base.store";
import { TransponderMode } from "./transponder-mode.enum";
import { TransponderResponseModel } from "../api/transponder.api.type";
import { create } from "zustand";

interface ITransponderStore extends BaseStore {
    transponderModes: TransponderMode[];
    setTransponderModes: (transponderModes: TransponderMode[]) => void;

    transponders: TransponderResponseModel[];
    setTransponders: (transponders: TransponderResponseModel[]) => void;
}

export const useTransponderStore = create<ITransponderStore>((set) => ({
    ...baseStore,

    transponderModes: [],
    setTransponderModes: (transponderModes: TransponderMode[]) => set({ transponderModes }),

    transponders: [],
    setTransponders: (transponders: TransponderResponseModel[]) => set({ transponders }),
}));