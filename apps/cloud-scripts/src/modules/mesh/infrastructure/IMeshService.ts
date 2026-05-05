export interface IMeshService {
  getIpList(cidr: string): Promise<string[]>;
  restartServices(): Promise<void>;
  createZone(cidr: string, bridgeName: string, gatewayIp: string): Promise<void>;
  createInterface(bridgeName: string, cidr: string, gateway: string): Promise<void>;
  ipcalcField(cidr: string, field: string): Promise<string | null>;
  createDnsmasqConfig(bridgeName: string, gateway: string, ipList: string[]): Promise<void>;
  createNftablesConfig(bridgeName: string, cidr: string, externalInterface?: string): Promise<void>;
  backupNftablesConfig(): Promise<void>;
  latestBackup(): string;
  saveNftConfiguration(): Promise<void>;
  deleteNftablesConfig(bridgeName: string, cidr: string, externalInterface?: string): Promise<void>;
  deleteZone(bridgeName: string, cidr: string): Promise<void>;
  addNodeToZone(bridgeName: string, mac: string, ip: string): Promise<void>;
  isIpInZoneRange(bridgeName: string, ip: string): Promise<boolean>;
  checkNodeInZone(bridgeName: string, ip: string): Promise<boolean>;
  deleteNodeFromZone(bridgeName: string, mac: string): Promise<void>;
  linkVnetToBridge(vnetName: string, bridgeName: string): Promise<void>;
  unlinkVnetFromBridge(vnetName: string, bridgeName: string): Promise<void>;
  isZoneValid(bridgeName: string, cidr: string): Promise<boolean>;
  addFiber(bridgeName: string, protocol: string, externalPort: number | number[], targetIp: string, internalPort: number | number[], externalInterface?: string): Promise<void>;
  removeFiber(bridgeName: string, protocol: string, externalPort: number | number[], targetIp: string, internalPort: number | number[], externalInterface?: string): Promise<void>;
  isPortAvailable(ipAddress: string, targetPort: number, protocol: string): Promise<boolean>;
  findNextPort(protocol: string): Promise<number>;
  listActiveZones(): Promise<string[]>;
  forceResetMesh(): Promise<void>;
  verifyWorkerConnectivity(ip: string, timeout?: number): Promise<boolean>;
  diagnoseBridgeConnectivity(bridgeName: string, ip: string): Promise<{
    bridgeExists: boolean;
    bridgeUp: boolean;
    dhcpConfigExists: boolean;
    ipInDhcpRange: boolean;
    arpEntry: boolean;
    pingSuccessful: boolean;
  }>;
  forceRenewDhcpLease(bridgeName: string, mac?: string | null): Promise<boolean>;
  fixVnetBridgeConnection(vnetName: string, bridgeName: string): Promise<boolean>;
  validateNftables(nftRuleset: string, zones: any[], nodes: any[], fibers: any[]): {
    valid: boolean;
    missing: { nat: any[]; fibers: any[] };
    details: string[];
  };
}
