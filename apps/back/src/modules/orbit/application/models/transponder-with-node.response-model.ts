import { Expose, Type } from "class-transformer"
import { TransponderResponseModel } from "./transponder.response-model"
import { NodeResponseModel } from "@/mesh/application/models/node.response-model";

export class TransponderWithNodeResponseModel extends TransponderResponseModel {
    @Expose()
    @Type(() => NodeResponseModel)
    node: NodeResponseModel;
}