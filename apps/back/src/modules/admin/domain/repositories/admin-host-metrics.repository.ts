import { HostMetricSampleModel } from '../models/host-metrics.model';

export const ADMIN_HOST_METRICS_REPOSITORY_SYMBOL = Symbol(
  'ADMIN_HOST_METRICS_REPOSITORY',
);

export abstract class AdminHostMetricsRepository {
  abstract findLatestPerHost(): Promise<HostMetricSampleModel[]>;
}
