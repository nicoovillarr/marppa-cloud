import { FiberDTO } from "@/libs/types/dto/fiber-dto";
import { NodeDTO } from "@/libs/types/dto/node-dto";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";

export default interface MeshRepository {
  getZones: () => Promise<ZoneDTO[]>;

  getZoneById: (zoneId: string) => Promise<ZoneDTO>;

  createZone: (
    companyId: string,
    name: string,
    description: string
  ) => Promise<ZoneDTO>;

  updateZone: (
    zoneId: string,
    data: Partial<Omit<ZoneDTO, "id" | "companyId">>
  ) => Promise<ZoneDTO>;

  deleteZones: (zoneIds: string[]) => Promise<void>;

  getFibers: (zoneId: string, nodeId: string) => Promise<FiberDTO[]>;

  getNodes: (zoneId: string) => Promise<NodeDTO[]>;

  createFiber: (
    zoneId: string,
    nodeId: string,
    data: FiberDTO
  ) => Promise<FiberDTO>;

  updateFiber: (
    zoneId: string,
    nodeId: string,
    fiberId: number,
    data: FiberDTO
  ) => Promise<FiberDTO>;
}
