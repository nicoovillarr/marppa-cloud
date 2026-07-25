export const ORBIT_SERVICE_TOKEN = Symbol('ORBIT_SERVICE');

export abstract class OrbitService {
  abstract createPortal(id: string, address: string, type: string, apiKey: string): Promise<void>;
  
  abstract updateDynamicDNS(id: string, address: string, type: string, apiKey: string): Promise<void>;
  
  abstract getPublicIPAddress(): Promise<string | null>;
  
  abstract batchUpdateDynamicDNS(portals: any[], ip: string | null): Promise<void>;
  
  abstract updateCloudflareDNS(apiToken: string, domain: string, ip: string, options?: any): Promise<any>;
  
  abstract generatePortalConfig(portal: any, forceTransponder?: any): Promise<void>;
  
  abstract deletePortalConfig(portalId: string): Promise<void>;
  
  abstract reconcileOrbit(expectedPortalIds: string[]): Promise<string[]>;

  abstract forceResetOrbit(): Promise<string[]>;
}
