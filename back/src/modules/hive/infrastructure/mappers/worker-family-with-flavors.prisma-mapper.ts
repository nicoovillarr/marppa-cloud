import { WorkerFamilyWithFlavorsModel } from "@/hive/domain/models/worker-family-with-flavors.model";
import { WorkerFamily, WorkerFlavor } from "@prisma/client";
import { WorkerFlavorPrismaMapper } from "./worker-flavor.prisma-mapper";
import { WorkerFamilyPrismaMapper } from "./worker-family.prisma-mapper";

type WorkerFamilyWithFlavorsPrismaModel = WorkerFamily & {
    flavors: WorkerFlavor[];
}

export class WorkerFamilyWithFlavorsPrismaMapper {
    static toDomain(raw: WorkerFamilyWithFlavorsPrismaModel): WorkerFamilyWithFlavorsModel {
        return new WorkerFamilyWithFlavorsModel(
            WorkerFamilyPrismaMapper.toEntity(raw),
            raw.flavors.map(WorkerFlavorPrismaMapper.toEntity),
        );
    }
}