import { Expose, Type } from 'class-transformer';
import { NodeResponseModel } from '@/mesh/application/models/node.response-model';
import { AtomImageResponseModel } from './atom-image.response-model';
import { AtomResponseModel } from './atom.response-model';

export class AtomWithRelationsResponseModel extends AtomResponseModel {
  @Expose()
  @Type(() => AtomImageResponseModel)
  image: AtomImageResponseModel;

  @Expose()
  @Type(() => NodeResponseModel)
  node: NodeResponseModel | null;
}
