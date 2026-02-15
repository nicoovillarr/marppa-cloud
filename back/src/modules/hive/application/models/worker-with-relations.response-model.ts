import { Expose, Type } from 'class-transformer';
import { WorkerFlavorResponseModel } from './worker-flavor.response-model';
import { NodeResponseModel } from '@/mesh/application/models/node.response-model';

export class WorkerWithRelationsResponseModel {
    @Expose() id: string;
    @Expose() name: string;
    @Expose() status: string;
    @Expose() macAddress: string;
    @Expose() createdAt: Date;
    @Expose() createdBy: string;
    @Expose() updatedAt: Date | null;
    @Expose() updatedBy: string | null;
    @Expose() ownerId: string;
    @Expose() imageId: number;
    @Expose() flavorId: number;

    @Expose()
    @Type(() => WorkerFlavorResponseModel)
    flavor: WorkerFlavorResponseModel;

    @Expose()
    @Type(() => NodeResponseModel)
    node: NodeResponseModel | null;
}
