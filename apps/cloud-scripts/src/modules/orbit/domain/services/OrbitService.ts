export const ORBIT_SERVICE_TOKEN = Symbol('ORBIT_SERVICE');

export interface PortalDnsRecord {
  id: string;
  address: string;
  type: string;
  apiKey: string;
}

export interface PortalDnsSyncOptions {
  force?: boolean;
}

export abstract class OrbitService {
  abstract syncPortalDns(portal: PortalDnsRecord, options?: PortalDnsSyncOptions): Promise<void>;

  abstract batchSyncPortalDns(
    portals: PortalDnsRecord[],
    ip: string | null,
    options?: PortalDnsSyncOptions,
  ): Promise<void>;

  abstract getPublicIPAddress(): Promise<string | null>;

  abstract generatePortalConfig(portal: any, forceTransponder?: any): Promise<void>;

  abstract deletePortalConfig(portalId: string): Promise<void>;

  abstract reconcileOrbit(expectedPortalIds: string[]): Promise<string[]>;

  abstract forceResetOrbit(): Promise<string[]>;
}
