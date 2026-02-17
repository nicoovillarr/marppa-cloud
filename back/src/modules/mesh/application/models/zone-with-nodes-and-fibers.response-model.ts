import { NodeWithFibersResponseModel } from "./node-with-fibers.response-model";
import { ZoneResponseModel } from "./zone.response-model";

export class ZoneWithNodesAndFibersResponseModel extends ZoneResponseModel {
    nodes: NodeWithFibersResponseModel[];
}