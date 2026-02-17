import { NodeResponseModel } from "./node.response-model";
import { ZoneResponseModel } from "./zone.response-model";

export class ZoneWithNodesResponseModel extends ZoneResponseModel {
    nodes: NodeResponseModel[];
}