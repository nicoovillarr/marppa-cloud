import { NodeEntity } from "@/mesh/domain/entities/node.entity";
import { WorkerFlavorEntity } from "../entities/worker-flavor.entity";
import { WorkerEntity } from "../entities/worker.entity";

export class WorkerWithRelationsModel {
    constructor(
        public readonly worker: WorkerEntity,
        public readonly flavor: WorkerFlavorEntity,
        public readonly node: NodeEntity | null,
    ) { }
}