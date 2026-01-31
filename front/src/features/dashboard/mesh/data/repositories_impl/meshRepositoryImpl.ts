import { MeshApiService } from "@/core/data/api-proxy/mesh-api-service";
import MeshRepository from "../../domain/repositories/meshRepository";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { FiberDTO } from "@/libs/types/dto/fiber-dto";
import { NodeDTO } from "@/libs/types/dto/node-dto";

export default class MeshRepositoryImpl implements MeshRepository {
  protected apiService: MeshApiService;

  constructor() {
    this.apiService = new MeshApiService();
  }

  async getZones(): Promise<ZoneDTO[]> {
    const { success, data } = await this.apiService.getZones();
    if (!success) {
      throw new Error(data);
    }

    return data;
  }

  async getZoneById(zoneId: string): Promise<ZoneDTO> {
    const { success, data } = await this.apiService.getZoneById(zoneId);
    if (!success) {
      throw new Error(data);
    }

    return data;
  }

  async createZone(
    companyId: string,
    name: string,
    description: string
  ): Promise<ZoneDTO> {
    const { success, data } = await this.apiService.createZone(
      companyId,
      name,
      description
    );
    if (!success) {
      throw new Error(data);
    }

    return data;
  }

  async updateZone(
    zoneId: string,
    data: Partial<Omit<ZoneDTO, "id" | "companyId">>
  ): Promise<ZoneDTO> {
    const { success, data: updatedZone } = await this.apiService.updateZone(
      zoneId,
      data
    );
    if (!success) {
      throw new Error(updatedZone);
    }

    return updatedZone;
  }

  async deleteZones(zoneIds: string[]): Promise<void> {
    const { success, data } = await this.apiService.deleteZones(zoneIds);
    if (!success) {
      throw new Error(data);
    }

    return;
  }

  async getFibers(zoneId: string, nodeId: string): Promise<FiberDTO[]> {
    const { success, data } = await this.apiService.getFibers(zoneId, nodeId);
    if (!success) {
      throw new Error(data);
    }

    return data;
  }

  async getNodes(zoneId: string): Promise<NodeDTO[]> {
    const { success, data } = await this.apiService.getNodes(zoneId);
    if (!success) {
      throw new Error(data);
    }

    return data;
  }

  async createFiber(
    zoneId: string,
    nodeId: string,
    data: FiberDTO
  ): Promise<FiberDTO> {
    const { success, data: newFiber } = await this.apiService.createFiber(
      zoneId,
      nodeId,
      data
    );
    if (!success) {
      throw new Error(newFiber);
    }
   
    return newFiber;
  }

  async updateFiber(
    zoneId: string,
    nodeId: string,
    fiberId: number,
    data: FiberDTO
  ): Promise<FiberDTO> {
    const { success, data: updatedFiber } = await this.apiService.updateFiber(
      zoneId,
      nodeId,
      fiberId,
      data
    );
    if (!success) {
      throw new Error(updatedFiber);
    }

    return updatedFiber;
  }
}
