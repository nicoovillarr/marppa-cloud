import { OrbitService } from '../../domain/services/OrbitService';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
export class StubOrbitService extends OrbitService {
  public async createPortal(id: string, address: string, type: string, _apiKey: string): Promise<void> {
    console.log(`[STUB] createPortal: id=${id} address=${address} type=${type}`);
  }

  public async updateDynamicDNS(id: string, address: string, type: string, _apiKey: string): Promise<void> {
    console.log(`[STUB] updateDynamicDNS: id=${id} address=${address} type=${type}`);
  }

  public async getPublicIPAddress(): Promise<string | null> {
    console.log('[STUB] getPublicIPAddress → 1.2.3.4');
    return '1.2.3.4';
  }

  public async batchUpdateDynamicDNS(portals: any[], ip: string | null): Promise<void> {
    console.log(`[STUB] batchUpdateDynamicDNS: ${portals.length} portals ip=${ip}`);
  }

  public async updateCloudflareDNS(apiToken: string, domain: string, ip: string, _options?: any): Promise<any> {
    console.log(`[STUB] updateCloudflareDNS: domain=${domain} ip=${ip} token=${apiToken.slice(0, 4)}...`);
    return { id: 'stub-record-id', name: domain, content: ip };
  }

  public async generateNginxConfig(portal: any, forceTransponder?: any): Promise<void> {
    console.log(`[STUB] generateNginxConfig: portal=${portal?.id} forceTransponder=${forceTransponder}`);
  }

  public async deleteNginxConfig(portalId: string): Promise<void> {
    console.log(`[STUB] deleteNginxConfig: portal=${portalId}`);
  }

  public async forceResetOrbit(): Promise<void> {
    console.log('[STUB] forceResetOrbit');
  }
}
