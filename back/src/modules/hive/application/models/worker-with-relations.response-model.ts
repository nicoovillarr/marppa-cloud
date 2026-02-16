import { Expose, Type } from 'class-transformer';
import { WorkerFlavorResponseModel } from './worker-flavor.response-model';
import { NodeResponseModel } from '@/mesh/application/models/node.response-model';
import { WorkerResponseModel } from './worker.response-model';

export class WorkerWithRelationsResponseModel extends WorkerResponseModel {
    @Expose()
    @Type(() => WorkerFlavorResponseModel)
    flavor: WorkerFlavorResponseModel;

    @Expose()
    @Type(() => NodeResponseModel)
    node: NodeResponseModel | null;
}
