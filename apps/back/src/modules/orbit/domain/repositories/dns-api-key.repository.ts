import { DnsApiKeyEntity } from '../entities/dns-api-key.entity';
import { DnsApiKeyWithUsageModel } from '../models/dns-api-key-with-usage.model';

export const DNS_API_KEY_REPOSITORY = Symbol('DNS_API_KEY_REPOSITORY');

export abstract class DnsApiKeyRepository {
  abstract findById(id: number): Promise<DnsApiKeyEntity | null>;
  abstract findByOwnerIdsWithUsage(ownerIds: string[]): Promise<DnsApiKeyWithUsageModel[]>;
  abstract findByOwnerIdAndName(ownerId: string, name: string): Promise<DnsApiKeyEntity | null>;
  abstract countLivePortals(id: number): Promise<number>;
  abstract create(entity: DnsApiKeyEntity): Promise<DnsApiKeyEntity>;
  abstract update(entity: DnsApiKeyEntity): Promise<DnsApiKeyEntity>;
  abstract delete(id: number): Promise<void>;
}
