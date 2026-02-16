import { Expose, Type } from "class-transformer";
import { WorkerFamilyResponseModel } from "./worker-family.response-model";
import { WorkerFlavorResponseModel } from "./worker-flavor.response-model";

export class WorkerFamilyWithFlavorsResponseModel extends WorkerFamilyResponseModel {
    @Expose()
    @Type(() => WorkerFlavorResponseModel)
    flavors: WorkerFlavorResponseModel[];
}