import { PortalType } from '../enum/portal-type.enum';

export const DNS_PROVIDER = Symbol('DNS_PROVIDER');

export abstract class DnsProvider {
  abstract assertCanManage(
    type: PortalType,
    address: string,
    apiKey: string,
  ): Promise<void>;
}
