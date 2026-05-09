export const MESH_SERVICE_TOKEN = Symbol('MESH_SYMBOL');

export abstract class MeshService {
  abstract getIpList(cidr: string): Promise<string[]>;
  
  abstract restartServices(): Promise<void>;
  
  abstract createZone(cidr: string, bridgeName: string, gatewayIp: string | null): Promise<void>;
  
  abstract createInterface(bridgeName: string, cidr: string, gateway: string): Promise<void>;
  
  abstract ipcalcField(cidr: string, field: string): Promise<string | null>;
  
  abstract createDnsmasqConfig(bridgeName: string, gateway: string, ipList: string[]): Promise<void>;
  
  abstract createNftablesConfig(bridgeName: string, cidr: string, externalInterface?: string): Promise<void>;
  
  abstract backupNftablesConfig(): Promise<void>;
  
  abstract saveNftConfiguration(): Promise<void>;
  
  abstract deleteNftablesConfig(bridgeName: string, cidr: string, externalInterface?: string): Promise<void>;
  
  abstract deleteZone(bridgeName: string, cidr: string): Promise<void>;
  
  abstract addNodeToZone(bridgeName: string, mac: string, ip: string): Promise<void>;
  
  abstract isIpInZoneRange(bridgeName: string, ip: string): Promise<boolean>;
  
  abstract checkNodeInZone(bridgeName: string, ip: string): Promise<boolean>;
  
  abstract deleteNodeFromZone(bridgeName: string, mac: string): Promise<void>;
  
  abstract linkVnetToBridge(vnetName: string, bridgeName: string): Promise<void>;
  
  abstract unlinkVnetFromBridge(vnetName: string, bridgeName: string): Promise<void>;
  
  abstract isZoneValid(bridgeName: string, cidr: string): Promise<boolean>;
  
  abstract addFiber(bridgeName: string, protocol: string, externalPort: number | number[], targetIp: string, internalPort: number | number[], externalInterface?: string): Promise<void>;
  
  abstract removeFiber(bridgeName: string, protocol: string, externalPort: number | number[], targetIp: string, internalPort: number | number[], externalInterface?: string): Promise<void>;
  
  abstract isPortAvailable(ipAddress: string, targetPort: number, protocol: string): Promise<boolean>;
  
  abstract findNextPort(protocol: string): Promise<number>;
  
  abstract listActiveZones(): Promise<string[]>;
  
  abstract forceResetMesh(): Promise<void>;
  
  abstract verifyWorkerConnectivity(ip: string, timeout?: number): Promise<boolean>;
  
  abstract diagnoseBridgeConnectivity(bridgeName: string, ip: string): Promise<{
    bridgeExists: boolean;
    bridgeUp: boolean;
    dhcpConfigExists: boolean;
    ipInDhcpRange: boolean;
    arpEntry: boolean;
    pingSuccessful: boolean;
  }>;
  
  abstract forceRenewDhcpLease(bridgeName: string, mac?: string | null): Promise<boolean>;
  
  abstract fixVnetBridgeConnection(vnetName: string, bridgeName: string): Promise<boolean>;
  
  abstract validateNftables(nftRuleset: string, zones: any[], nodes: any[], fibers: any[]): {
    valid: boolean;
    missing: { nat: any[]; fibers: any[] };
    details: string[];
  };
}
