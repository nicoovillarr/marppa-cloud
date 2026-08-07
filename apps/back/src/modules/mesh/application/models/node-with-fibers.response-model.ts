import { AttachedWorkloadResponseModel } from "./attached-workload.response-model";
import { FiberResponseModel } from "./fiber.response-model";
import { NodeResponseModel } from "./node.response-model";

export class NodeWithFibersResponseModel extends NodeResponseModel {
    fibers: FiberResponseModel[];
    attached: AttachedWorkloadResponseModel | null;
}
