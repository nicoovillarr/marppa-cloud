import { Worker, WorkerFlavor, Node } from "@prisma/client";
import { WorkerWithRelationsModel } from "@/hive/domain/models/worker-with-relations.model";
import { WorkerPrismaMapper } from "./worker.prisma-mapper";
import { WorkerFlavorPrismaMapper } from "./worker-flavor.prisma-mapper";
import { NodePrismaMapper } from "@/mesh/infrastructure/mappers/node.prisma-mapper";

type WorkerWithRelationsPrismaModel = Worker & {
    flavor: WorkerFlavor;
    node: Node;
}

export class WorkerWithRelationsPrismaMapper {
    static toDomain(
        raw: WorkerWithRelationsPrismaModel
    ): WorkerWithRelationsModel {
        return new WorkerWithRelationsModel(
            WorkerPrismaMapper.toEntity(raw),
            WorkerFlavorPrismaMapper.toEntity(raw.flavor),
            raw.node ? NodePrismaMapper.toEntity(raw.node) : null
        );
    }
}