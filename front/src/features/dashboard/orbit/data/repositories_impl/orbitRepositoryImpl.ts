import { PortalDTO } from "@/libs/types/dto/portal-dto";
import OrbitRepository from "../../domain/repositories/orbitRepository";
import { OrbitApiService } from "@/core/data/api-proxy/orbit-api-service";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";

export default class OrbitRepositoryImpl implements OrbitRepository {
  protected apiService: OrbitApiService;

  constructor() {
    this.apiService = new OrbitApiService();
  }

  async getPortals(): Promise<PortalDTO[]> {
    const response = await this.apiService.getPortals();
    if (!response.success) {
      throw new Error(response.data || "Failed to fetch portals");
    }

    return response.data;
  }

  async getPortal(portalId: string): Promise<PortalDTO | null> {
    const response = await this.apiService.getPortal(portalId);
    if (!response.success) {
      throw new Error(response.data || "Failed to fetch portal");
    }

    return response.data;
  }

  async createPortal(data: PortalDTO): Promise<PortalDTO> {
    const response = await this.apiService.createPortal(data);
    if (!response.success) {
      const errorMessage =
        typeof response.data === "string"
          ? response.data
          : response.data.errors
          ? Object.values(response.data.errors).flat().join(", ")
          : "Failed to create portal";
      throw new Error(errorMessage);
    }

    return response.data;
  }

  async updatePortal(portalId: string, data: PortalDTO): Promise<PortalDTO> {
    const response = await this.apiService.updatePortal(portalId, data);
    if (!response.success) {
      const errorMessage =
        typeof response.data === "string"
          ? response.data
          : response.data.errors
          ? Object.values(response.data.errors).flat().join(", ")
          : "Failed to update portal";
      throw new Error(errorMessage);
    }

    return response.data;
  }

  async deletePortals(portalIds: string[]): Promise<void> {
    await this.apiService.deletePortals(portalIds);
  }

  async createTransponder(
    portalId: string,
    transponder: TransponderDTO
  ): Promise<TransponderDTO> {
    const { data, success } = await this.apiService.createTransponder(
      portalId,
      transponder
    );
    if (!success) {
      throw new Error("Failed to create transponder");
    }

    return data;
  }

  async updateTransponder(
    portalId: string,
    transponderId: string,
    transponder: TransponderDTO
  ): Promise<TransponderDTO> {
    const { data, success } = await this.apiService.updateTransponder(
      portalId,
      transponderId,
      transponder
    );
    if (!success) {
      throw new Error("Failed to update transponder");
    }
    return data;
  }
}
