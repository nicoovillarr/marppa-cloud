import { ApiResponse } from "@/libs/types/api-response";
import { ApiProxyService } from "./api-proxy-service";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";

export class OrbitApiService extends ApiProxyService {
  constructor() {
    super("orbit");
  }

  getPortals: () => Promise<ApiResponse> = () => this.get("/portals");

  getPortal: (portalId: string) => Promise<ApiResponse> = (portalId) =>
    this.get(`/portals/${portalId}`);

  createPortal: (data: PortalDTO) => Promise<ApiResponse> = (data) =>
    this.post("/portals", data);

  updatePortal: (portalId: string, data: PortalDTO) => Promise<ApiResponse> = (
    portalId,
    data
  ) => this.put(`/portals/${portalId}`, data);

  deletePortals: (portalIds: string[]) => Promise<ApiResponse> = (portalIds) =>
    this.delete("/portals", portalIds);

  readonly createTransponder: (
    portalId: string,
    transponder: TransponderDTO
  ) => Promise<ApiResponse> = (portalId, transponder) =>
    this.post(`/portals/${portalId}/transponders`, transponder);

  readonly updateTransponder: (
    portalId: string,
    transponderId: string,
    data: TransponderDTO
  ) => Promise<ApiResponse> = (portalId, transponderId, data) =>
    this.put(`/portals/${portalId}/transponders/${transponderId}`, data);
}
