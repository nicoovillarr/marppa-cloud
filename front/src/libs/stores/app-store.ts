import { ChunkDTO } from "@/libs/types/dto/chunk-dto";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { UserDTO } from "@/libs/types/dto/user-dto";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { WorkerImageDTO } from "@/libs/types/dto/worker-image-dto";
import { WorkerMmiDTO } from "@/libs/types/dto/worker-mmi-dto";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
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

  workerImages?: WorkerImageDTO[];
  setWorkerImages: (workerImages: WorkerImageDTO[]) => void;

  workerMmi?: WorkerMmiDTO[];
  setWorkerMmi: (workerMmi: WorkerMmiDTO[]) => void;

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

  portals: PortalDTO[];
  setPortals: (portals: PortalDTO[]) => void;
  addPortal: (portal: PortalDTO) => void;
  updatePortal: (id: string, field: keyof PortalDTO, value: any) => void;
  removePortal: (id: string) => void;

  reset: () => void;
}

const defaultState = {
  isInitialized: false,
  user: null,
  workers: null,
  workerImages: null,
  workerMmi: null,
  bits: null,
  zones: null,
  portals: null,
};

export const useAppStore = create<AppStore>()((set, get) => ({
  ...defaultState,
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),

  setUser: (user: UserDTO | null) => set({ user }),
  updateUser: (field: keyof UserDTO, value: any) =>
    set((state) => ({
      user: state.user ? { ...state.user, [field]: value } : null,
    })),

  setWorkers: (newWorkers: WorkerDTO[]) => {
    const { workers: oldWorkers } = get();
    console.log("Setting workers:", oldWorkers, newWorkers);
    set({ workers: newWorkers });
  },
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

  setWorkerImages: (workerImages: WorkerImageDTO[]) => set({ workerImages }),

  setWorkerMmi: (workerMmi: WorkerMmiDTO[]) => set({ workerMmi }),

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

  setPortals: (portals: PortalDTO[]) => set({ portals }),
  addPortal: (portal: PortalDTO) =>
    set((state) => ({ portals: [...(state.portals || []), portal] })),
  updatePortal: (id: string, field: keyof PortalDTO, value: any) =>
    set((state) => ({
      portals: state.portals?.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      ),
    })),
  removePortal: (id: string) =>
    set((state) => ({
      portals: state.portals?.filter((d) => d.id !== id),
    })),

  reset: () => set({ ...defaultState }),
}));
