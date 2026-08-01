import { MeshService } from '../../domain/services/MeshService';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
export class StubMeshService extends MeshService {
  public async getIpList(cidr: string): Promise<string[]> {
    console.log(`[STUB] getIpList: ${cidr}`);
    return ['10.0.0.0', '10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.254'];
  }

  public async restartServices(): Promise<void> {
    console.log('[STUB] restartServices');
  }

  public async createZone(cidr: string, bridgeName: string, gatewayIp: string | null): Promise<void> {
    console.log(`[STUB] createZone: cidr=${cidr} bridge=${bridgeName} gateway=${gatewayIp}`);
  }

  public async createInterface(bridgeName: string, cidr: string, gateway: string): Promise<void> {
    console.log(`[STUB] createInterface: bridge=${bridgeName} cidr=${cidr} gateway=${gateway}`);
  }

  public async ipcalcField(cidr: string, field: string): Promise<string | null> {
    console.log(`[STUB] ipcalcField: cidr=${cidr} field=${field}`);
    if (field === 'Netmask') return '255.255.255.0';
    return null;
  }

  public async createDnsmasqConfig(bridgeName: string, gateway: string, _ipList: string[]): Promise<void> {
    console.log(`[STUB] createDnsmasqConfig: bridge=${bridgeName} gateway=${gateway}`);
  }

  public async createNftablesConfig(bridgeName: string, cidr: string, externalInterface?: string): Promise<void> {
    console.log(`[STUB] createNftablesConfig: bridge=${bridgeName} cidr=${cidr} iface=${externalInterface}`);
  }

  public async backupNftablesConfig(): Promise<void> {
    console.log('[STUB] backupNftablesConfig');
  }

  public async saveNftConfiguration(): Promise<void> {
    console.log('[STUB] saveNftConfiguration');
  }

  public async deleteNftablesConfig(bridgeName: string, cidr: string, externalInterface?: string): Promise<void> {
    console.log(`[STUB] deleteNftablesConfig: bridge=${bridgeName} cidr=${cidr} iface=${externalInterface}`);
  }

  public async deleteZone(bridgeName: string, cidr: string): Promise<void> {
    console.log(`[STUB] deleteZone: bridge=${bridgeName} cidr=${cidr}`);
  }

  public async addNodeToZone(bridgeName: string, mac: string, ip: string): Promise<void> {
    console.log(`[STUB] addNodeToZone: bridge=${bridgeName} mac=${mac} ip=${ip}`);
  }

  public async isIpInZoneRange(bridgeName: string, ip: string): Promise<boolean> {
    console.log(`[STUB] isIpInZoneRange: bridge=${bridgeName} ip=${ip} → true`);
    return true;
  }

  public async checkNodeInZone(bridgeName: string, ip: string): Promise<boolean> {
    console.log(`[STUB] checkNodeInZone: bridge=${bridgeName} ip=${ip} → false`);
    return false;
  }

  public async deleteNodeFromZone(bridgeName: string, mac: string): Promise<boolean> {
    console.log(`[STUB] deleteNodeFromZone: bridge=${bridgeName} mac=${mac}`);
    return true;
  }

  public async linkVnetToBridge(vnetName: string, bridgeName: string): Promise<void> {
    console.log(`[STUB] linkVnetToBridge: vnet=${vnetName} bridge=${bridgeName}`);
  }

  public async unlinkVnetFromBridge(vnetName: string, bridgeName: string): Promise<void> {
    console.log(`[STUB] unlinkVnetFromBridge: vnet=${vnetName} bridge=${bridgeName}`);
  }

  public async isZoneValid(bridgeName: string, cidr: string): Promise<boolean> {
    console.log(`[STUB] isZoneValid: bridge=${bridgeName} cidr=${cidr} → true`);
    return true;
  }

  public async addFiber(bridgeName: string, protocol: string, externalPort: number | number[], targetIp: string, internalPort: number | number[], externalInterface?: string): Promise<void> {
    console.log(`[STUB] addFiber: bridge=${bridgeName} ${protocol} ${externalPort}→${targetIp}:${internalPort} iface=${externalInterface}`);
  }

  public async removeFiber(bridgeName: string, protocol: string, externalPort: number | number[], targetIp: string, internalPort: number | number[], externalInterface?: string): Promise<number> {
    console.log(`[STUB] removeFiber: bridge=${bridgeName} ${protocol} ${externalPort}→${targetIp}:${internalPort} iface=${externalInterface}`);
    return 0;
  }

  public async isPortAvailable(_ipAddress: string, _targetPort: number, _protocol: string): Promise<boolean> {
    console.log(`[STUB] isPortAvailable → true`);
    return true;
  }

  public async findNextPort(protocol: string): Promise<number> {
    const port = 30000 + Math.floor(Math.random() * 10000);
    console.log(`[STUB] findNextPort: ${protocol} → ${port}`);
    return port;
  }

  public async listActiveZones(): Promise<string[]> {
    console.log('[STUB] listActiveZones → []');
    return [];
  }

  public async reconcileMesh(
    zones: { id: string; cidr: string; gateway: string }[],
    fibers: {
      protocol: string;
      hostPort: number;
      targetIp: string;
      targetPort: number;
    }[],
    protectedZoneIds: string[] = [],
  ): Promise<{ removedZones: string[] }> {
    console.log(`[STUB] reconcileMesh: ${zones.length} zones ${fibers.length} fibers`);
    return { removedZones: [] };
  }

  public async forceResetMesh(): Promise<{ removedZones: string[] }> {
    console.log('[STUB] forceResetMesh');
    return { removedZones: [] };
  }

  public async verifyWorkerConnectivity(ip: string, timeout?: number): Promise<boolean> {
    console.log(`[STUB] verifyWorkerConnectivity: ip=${ip} timeout=${timeout} → true`);
    return true;
  }

  public async diagnoseBridgeConnectivity(bridgeName: string, ip: string): Promise<{
    bridgeExists: boolean;
    bridgeUp: boolean;
    dhcpConfigExists: boolean;
    ipInDhcpRange: boolean;
    arpEntry: boolean;
    pingSuccessful: boolean;
  }> {
    console.log(`[STUB] diagnoseBridgeConnectivity: bridge=${bridgeName} ip=${ip}`);
    return { bridgeExists: true, bridgeUp: true, dhcpConfigExists: true, ipInDhcpRange: true, arpEntry: true, pingSuccessful: true };
  }

  public async forceRenewDhcpLease(bridgeName: string, mac?: string | null): Promise<boolean> {
    console.log(`[STUB] forceRenewDhcpLease: bridge=${bridgeName} mac=${mac} → true`);
    return true;
  }

  public async fixVnetBridgeConnection(vnetName: string, bridgeName: string): Promise<boolean> {
    console.log(`[STUB] fixVnetBridgeConnection: vnet=${vnetName} bridge=${bridgeName} → true`);
    return true;
  }

  public validateNftables(nftRuleset: string, zones: any[], nodes: any[], fibers: any[]): {
    valid: boolean;
    missing: { nat: any[]; fibers: any[] };
    details: string[];
  } {
    console.log(`[STUB] validateNftables: ${zones.length} zones ${nodes.length} nodes ${fibers.length} fibers`);
    return { valid: true, missing: { nat: [], fibers: [] }, details: [] };
  }
}
