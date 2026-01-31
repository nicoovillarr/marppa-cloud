import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";

export default interface OrbitRepository {
  getPortals: () => Promise<PortalDTO[]>;

  getPortal: (portalId: string) => Promise<PortalDTO | null>;

  createPortal: (data: PortalDTO) => Promise<PortalDTO>;

  updatePortal: (portalId: string, data: PortalDTO) => Promise<PortalDTO>;

  deletePortals: (portalIds: string[]) => Promise<void>;

  createTransponder: (
    portalId: string,
    data: TransponderDTO
  ) => Promise<TransponderDTO>;

  updateTransponder: (
    portalId: string,
    transponderId: string,
    data: TransponderDTO
  ) => Promise<TransponderDTO>;
}
