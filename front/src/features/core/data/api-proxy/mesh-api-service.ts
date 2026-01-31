import { FiberDTO } from "@/libs/types/dto/fiber-dto";
import { ApiProxyService } from "./api-proxy-service";

export class MeshApiService extends ApiProxyService {
  constructor() {
    super("mesh");
  }

  readonly getZones = () => this.get("/zones");

  readonly getZoneById = (zoneId: string) => this.get(`/zones/${zoneId}`);

  readonly createZone = (
    companyId: string,
    name: string,
    description: string
  ) => this.post("/zones", { companyId, name, description });

  readonly updateZone = (
    zoneId: string,
    data: Partial<{ name: string; description: string }>
  ) => this.put(`/zones/${zoneId}`, data);

  readonly deleteZones = (nodeIds: string[]) => this.delete("/zones", nodeIds);

  readonly getFibers = (zoneId: string, nodeId: string) =>
    this.get(`/zones/${zoneId}/nodes/${nodeId}/fibers`);

  readonly getNodes = (zoneId: string) => this.get(`/zones/${zoneId}/nodes`);

  readonly createFiber = (zoneId: string, nodeId: string, data: FiberDTO) =>
    this.post(`/zones/${zoneId}/nodes/${nodeId}/fibers`, data);

  readonly updateFiber = (
    zoneId: string,
    nodeId: string,
    fiberId: number,
    data: FiberDTO
  ) => this.put(`/zones/${zoneId}/nodes/${nodeId}/fibers/${fiberId}`, data);
}
