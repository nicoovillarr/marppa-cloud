import { WorkerFamilyEntity } from '../entities/worker-family.entity';
import { WorkerFlavorEntity } from '../entities/worker-flavor.entity';

export class WorkerFlavorWithFamilyModel {
  constructor(
    public readonly flavor: WorkerFlavorEntity,
    public readonly family: WorkerFamilyEntity,
  ) { }

  get qualifiedName(): string {
    return `${this.family.name}.${this.flavor.name}`;
  }
}
