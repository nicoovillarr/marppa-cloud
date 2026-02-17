import { FiberEntity } from "../entities/fiber.entity";
import { NodeEntity } from "../entities/node.entity";

export class NodeWithFibersModel {
    constructor(
        public readonly node: NodeEntity,
        public readonly fibers: FiberEntity[],
    ) { }
}