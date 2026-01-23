import { ChunkDTO } from "@/types/dto/chunk-dto";
import { UserDTO } from "@/types/dto/user-dto";
import { WorkerDTO } from "@/types/dto/worker-dto";
import { ZoneDTO } from "@/types/dto/zone-dto";
import { create } from "zustand";

export interface AppStore {
  isInitialized: boolean;
  setIsInitialized: (isInitialized: boolean) => void;

  user: UserDTO | null;
  setUser: (user: UserDTO | null) => void;
  updateUser: (field: keyof UserDTO, value: any) => void;

  workers: WorkerDTO[];
  setWorkers: (workers: WorkerDTO[]) => void;
  addWorker: (worker: WorkerDTO) => void;
  updateWorker: (id: string, field: keyof WorkerDTO, value: any) => void;
  removeWorker: (id: string) => void;

  bits: ChunkDTO[];
  setBits: (bits: ChunkDTO[]) => void;
  addBit: (bit: ChunkDTO) => void;
  updateBit: (id: string, field: keyof ChunkDTO, value: any) => void;
  removeBit: (id: string) => void;

  zones: ZoneDTO[];
  setZones: (zones: ZoneDTO[]) => void;
  addZone: (zone: ZoneDTO) => void;
  updateZone: (id: string, field: keyof ZoneDTO, value: any) => void;
  removeZone: (id: string) => void;

  reset: () => void;
}

const defaultState = {
  isInitialized: false,
  user: null,
  workers: null,
  bits: null,
  zones: null,
};

export const useAppStore = create<AppStore>()((set) => ({
  ...defaultState,
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),

  setUser: (user: UserDTO | null) => set({ user }),
  updateUser: (field: keyof UserDTO, value: any) =>
    set((state) => ({
      user: state.user ? { ...state.user, [field]: value } : null,
    })),

  setWorkers: (workers: WorkerDTO[]) => set({ workers }),
  addWorker: (vm: WorkerDTO) =>
    set((state) => ({ workers: [...(state.workers || []), vm] })),
  updateWorker: (id: string, field: keyof WorkerDTO, value: any) =>
    set((state) => ({
      workers: state.workers?.map((vm) =>
        vm.id === id ? { ...vm, [field]: value } : vm
      ),
    })),
  removeWorker: (id: string) =>
    set((state) => ({
      workers: state.workers?.filter((vm) => vm.id !== id),
    })),

  setBits: (bits: ChunkDTO[]) => set({ bits }),
  addBit: (container: ChunkDTO) =>
    set((state) => ({
      bits: [...(state.bits || []), container],
    })),
  updateBit: (id: string, field: keyof ChunkDTO, value: any) =>
    set((state) => ({
      bits: state.bits?.map((container) =>
        container.id === id ? { ...container, [field]: value } : container
      ),
    })),
  removeBit: (id: string) =>
    set((state) => ({
      bits: state.bits?.filter((container) => container.id !== id),
    })),

  setZones: (zones: ZoneDTO[]) => set({ zones }),
  addZone: (zone: ZoneDTO) =>
    set((state) => ({ zones: [...(state.zones || []), zone] })),
  updateZone: (id: string, field: keyof ZoneDTO, value: any) =>
    set((state) => ({
      zones: state.zones?.map((vpc) =>
        vpc.id === id ? { ...vpc, [field]: value } : vpc
      ),
    })),
  removeZone: (id: string) =>
    set((state) => ({
      zones: state.zones?.filter((vpc) => vpc.id !== id),
    })),

  reset: () => set({ ...defaultState }),
}));
