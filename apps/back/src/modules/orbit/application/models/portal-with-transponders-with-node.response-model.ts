import { Expose, Type } from 'class-transformer';
import { PortalResponseModel } from './portal.response-model';
import { TransponderWithNodeResponseModel } from './transponder-with-node.response-model';

export class PortalWithTranspondersWithNodeResponseModel extends PortalResponseModel {
    @Expose()
    @Type(() => TransponderWithNodeResponseModel)
    transponders: TransponderWithNodeResponseModel[];
}