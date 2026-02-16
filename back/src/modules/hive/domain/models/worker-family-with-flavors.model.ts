import { WorkerFamilyEntity } from "../entities/worker-family.entity";
import { WorkerFlavorEntity } from "../entities/worker-flavor.entity";

export class WorkerFamilyWithFlavorsModel {
    constructor(
        public readonly family: WorkerFamilyEntity,
        public readonly flavors: WorkerFlavorEntity[] = []
    ) { }
}