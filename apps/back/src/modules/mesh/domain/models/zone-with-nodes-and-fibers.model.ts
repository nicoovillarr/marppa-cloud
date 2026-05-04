import { ZoneEntity } from "../entities/zone.entity";
import { NodeWithFibersModel } from "./node-with-fibers.model";

export class ZoneWithNodesAndFibersModel {
    constructor(
        public readonly zone: ZoneEntity,
        public readonly nodes: NodeWithFibersModel[]
    ) { }
}