import { PortalEntity } from "../entities/portal.entity";
import { TransponderWithNodeModel } from "./transponder-with-node.model";

export class PortalWithTranspondersWithNodeModel {
    constructor(
        public readonly portal: PortalEntity,
        public readonly transponders: TransponderWithNodeModel[],
    ) { }
}