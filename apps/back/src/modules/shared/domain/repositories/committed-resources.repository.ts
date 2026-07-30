import { ResourceUsageModel } from '../models/resource-usage.model';

export const COMMITTED_RESOURCES_REPOSITORY_SYMBOL = Symbol(
  'COMMITTED_RESOURCES_REPOSITORY',
);

export abstract class CommittedResourcesRepository {
  abstract sumProvisioned(): Promise<ResourceUsageModel>;
  abstract sumRunning(excludedResourceId?: string): Promise<ResourceUsageModel>;
}
