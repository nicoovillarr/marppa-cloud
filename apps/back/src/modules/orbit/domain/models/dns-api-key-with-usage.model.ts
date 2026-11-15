import { DnsApiKeyEntity } from '../entities/dns-api-key.entity';

export class DnsApiKeyWithUsageModel {
  constructor(
    public readonly dnsApiKey: DnsApiKeyEntity,
    public readonly portalCount: number,
  ) {}
}
