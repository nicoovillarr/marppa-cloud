import MeshRepository from "../../domain/repositories/meshRepository";
import { container } from "@/libs/container";
import { FiberDTO } from "@/libs/types/dto/fiber-dto";
import { NodeDTO } from "@/libs/types/dto/node-dto";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";

export class MeshService {
  constructor(private meshRepository: MeshRepository) {}

  public static get instance(): MeshService {
    return container.resolve<MeshService>("MeshService");
  }

  public getZones = (): Promise<ZoneDTO[]> => this.meshRepository.getZones();

  public getZoneById = (zoneId: string): Promise<ZoneDTO> =>
    this.meshRepository.getZoneById(zoneId);

  public createZone = (
    companyId: string,
    name: string,
    description: string
  ): Promise<ZoneDTO> =>
    this.meshRepository.createZone(companyId, name, description);

  public updateZone = (
    zoneId: string,
    data: Partial<Omit<ZoneDTO, "id" | "companyId">>
  ): Promise<ZoneDTO> => this.meshRepository.updateZone(zoneId, data);

  public deleteZones = (nodeIds: string[]): Promise<void> =>
    this.meshRepository.deleteZones(nodeIds);

  public async validateZone(data: ZoneDTO): Promise<Record<string, string>> {
    const zones = (await this.meshRepository.getZones()).filter(
      (z) => data.id && z.id !== data.id
    );

    const { name } = data;

    const validationErrors: Record<string, string> = {};

    const onError = (field: string, message: string) => {
      if (!validationErrors[field]) {
        validationErrors[field] = message;
      }
    };

    if (!name || name.trim() === "") {
      onError("name", "Zone Name is required.");
    }

    if (zones.some((z) => z.name.toLowerCase() === name.toLowerCase())) {
      onError("name", "This zone name already exists.");
    }

    return validationErrors;
  }

  public async getFibers(zoneId: string, nodeId: string): Promise<FiberDTO[]> {
    return this.meshRepository.getFibers(zoneId, nodeId);
  }

  public async getNodes(zoneId: string): Promise<NodeDTO[]> {
    return this.meshRepository.getNodes(zoneId);
  }

  public async validateFiber(data: FiberDTO): Promise<Record<string, string>> {
    const { protocol, targetPort } = data;

    const validationErrors: Record<string, string> = {};

    const onError = (field: string, message: string) => {
      if (!validationErrors[field]) {
        validationErrors[field] = message;
      }
    };

    if (!protocol || protocol.trim() === "") {
      onError("protocol", "Protocol is required.");
    }

    if (!targetPort || targetPort <= 0 || targetPort > 65535) {
      onError("targetPort", "Target Port must be between 1 and 65535.");
    }

    return validationErrors;
  }

  public async createFiber(
    zoneId: string,
    nodeId: string,
    data: FiberDTO
  ): Promise<FiberDTO> {
    return this.meshRepository.createFiber(zoneId, nodeId, data);
  }

  public async updateFiber(
    zoneId: string,
    nodeId: string,
    fiberId: number,
    data: FiberDTO
  ): Promise<FiberDTO> {
    return this.meshRepository.updateFiber(zoneId, nodeId, fiberId, data);
  }
}
