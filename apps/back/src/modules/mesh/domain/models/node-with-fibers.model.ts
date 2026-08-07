import { FiberEntity } from "../entities/fiber.entity";
import { NodeEntity } from "../entities/node.entity";
import { AttachedWorkloadModel } from "./attached-workload.model";

export class NodeWithFibersModel {
    constructor(
        public readonly node: NodeEntity,
        public readonly fibers: FiberEntity[],
        public readonly attached: AttachedWorkloadModel | null = null,
    ) { }
}
