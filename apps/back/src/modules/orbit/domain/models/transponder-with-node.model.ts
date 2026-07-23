import { NodeEntity } from "@/mesh/domain/entities/node.entity";
import { TransponderEntity } from "../entities/transponder.entity";

export class TransponderWithNodeModel {
    constructor(
        public readonly transponder: TransponderEntity,
        public readonly node?: NodeEntity,
    ) { }
}