export interface IOrbitService {
  createPortal(id: string, address: string, type: string, apiKey: string): Promise<void>;
  updateDynamicDNS(id: string, address: string, type: string, apiKey: string): Promise<void>;
  getPublicIPAddress(): Promise<string | null>;
  batchUpdateDynamicDNS(portals: any[], ip: string | null): Promise<void>;
  updateCloudflareDNS(apiToken: string, domain: string, ip: string, options?: any): Promise<any>;
  generateNginxConfig(portal: any, forceTransponder?: any): Promise<void>;
  deleteNginxConfig(portalId: string): Promise<void>;
  forceResetOrbit(): Promise<void>;
}
