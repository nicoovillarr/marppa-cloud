import {
  OrbitService,
  PortalDnsRecord,
  PortalDnsSyncOptions,
} from '../../domain/services/OrbitService';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
export class StubOrbitService extends OrbitService {
  public async ensurePortalDnsRecord(portal: PortalDnsRecord): Promise<void> {
    console.log(
      `[STUB] ensurePortalDnsRecord: id=${portal.id} address=${portal.address}`,
    );
  }

  public async syncPortalDns(
    portal: PortalDnsRecord,
    options: PortalDnsSyncOptions = {},
  ): Promise<void> {
    console.log(
      `[STUB] syncPortalDns: id=${portal.id} address=${portal.address} type=${portal.type} force=${options.force === true}`,
    );
  }

  public async batchSyncPortalDns(
    portals: PortalDnsRecord[],
    ip: string | null,
    options: PortalDnsSyncOptions = {},
  ): Promise<void> {
    console.log(
      `[STUB] batchSyncPortalDns: ${portals.length} portals ip=${ip} force=${options.force === true}`,
    );
  }

  public async getPublicIPAddress(): Promise<string | null> {
    console.log('[STUB] getPublicIPAddress → 1.2.3.4');
    return '1.2.3.4';
  }

  public async generatePortalConfig(portal: any, forceTransponder?: any): Promise<void> {
    console.log(`[STUB] generatePortalConfig: portal=${portal?.id} forceTransponder=${forceTransponder}`);
  }

  public async deletePortalConfig(portalId: string): Promise<void> {
    console.log(`[STUB] deletePortalConfig: portal=${portalId}`);
  }

  public async reconcileOrbit(expectedPortalIds: string[]): Promise<string[]> {
    console.log(`[STUB] reconcileOrbit: ${expectedPortalIds.length} expected`);
    return [];
  }

  public async forceResetOrbit(): Promise<string[]> {
    console.log('[STUB] forceResetOrbit');
    return [];
  }
}
