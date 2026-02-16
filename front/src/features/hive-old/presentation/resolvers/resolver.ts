import "@/dashboard/hive/hiveFactory";
import "@/dashboard/mesh/meshFactory"

import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { HiveService } from "../services/hiveService";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { MeshService } from "@/dashboard/mesh/presentation/services/meshService";

export type HiveResolveResult = {
  workers: WorkerDTO[];
  zones: ZoneDTO[];
};

export const resolve: Resolver<HiveResolveResult> = async ({ user }) => {
  const workers$ = HiveService.instance.fetchWorkers();
  const zones$ = MeshService.instance.getZones();

  const [workers, zones] = await Promise.all([workers$, zones$]);

  return {
    workers,
    zones,
  };
};

export default resolve;
