import type { WorkerFlavor, WorkerImage } from '@marppa-cloud/db';

export const HIVE_SERVICE_TOKEN = Symbol('HIVE_SERVICE');

export type WorkerImageSource = Pick<WorkerImage, 'osType' | 'osFamily' | 'osVersion' | 'imageUrl'>;
export type WorkerInstanceSource = Pick<WorkerFlavor, 'ramMB' | 'cpuCores' | 'diskGB'>;

/** Static network config baked into cloud-init when the worker's IP is known (at assign). */
export type WorkerNetworkConfig = {
  ipAddress: string;
  gateway: string;
  prefix: number;
};

export abstract class HiveService {
  abstract ensureWorkerImageExists(workerImage: WorkerImageSource): Promise<boolean>;
  
  abstract createWorker(id: string, name: string, mac: string, workerImage: WorkerImageSource, workerInstance: WorkerInstanceSource, publicSshKeys: string[]): Promise<void>;
  
  abstract addSerialConsoleToGrub(imgPath: string): Promise<void>;
  
  abstract addSerialTTYToSecuretty(imgPath: string): Promise<void>;
  
  abstract createCloudInitISO(id: string, name: string, mac: string, destDir: string, sshPublicKeys: string[], net?: WorkerNetworkConfig): Promise<string>;

  /**
   * Rebuilds the cloud-init seed ISO in place once the worker's IP is known
   * (at NODE_ASSIGN_WORKER), baking a static IP and bumping the instance-id so
   * cloud-init re-runs the network config on the next boot.
   */
  abstract rearmCloudInitISO(id: string, name: string, mac: string, net: WorkerNetworkConfig): Promise<string>;
  
  abstract defineVM(name: string, memory: number, cpus: number, size: number, imgPath: string, seedIsoPath: string): Promise<void>;
  
  abstract stopWorker(vmName: string): Promise<void>;
  
  abstract forceStopWorker(vmName: string): Promise<void>;
  
  abstract startWorker(vmName: string): Promise<void>;
  
  abstract deleteWorker(vmName: string): Promise<void>;
  
  abstract editWorkerZone(vmName: string, bridgeName?: string | null, mac?: string | null): Promise<void>;
  
  abstract editWorkerMemory(vmName: string, newMemoryMb: number): Promise<void>;
  
  abstract editWorkerCpus(vmName: string, newVcpus: number): Promise<void>;
  
  abstract editWorkerDiskSpace(vmName: string, newDiskSizeGb: number): Promise<void>;
  
  abstract isBridgeInUse(bridgeName: string): Promise<boolean>;
  
  abstract isWorkerRunning(vmName: string): Promise<boolean>;
  
  abstract getWorkerVnet(vmName: string, bridgeName?: string | null): Promise<string | null>;
  
  abstract getDefinedWorkers(): Promise<string[]>;
  
  static readonly OPENSSH_PUBLIC_KEY =
    /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[a-z0-9-]+)\s+[A-Za-z0-9+/=]+(\s+\S+)?$/;

  abstract isGuestAgentReachable(vmName: string): Promise<boolean>;

  abstract applySshKeys(
    vmName: string,
    publicKeys: string[],
    guestUser?: string,
  ): Promise<void>;

  abstract applySshKeysOffline(
    vmName: string,
    publicKeys: string[],
    guestUser?: string,
  ): Promise<void>;

  abstract reconcileWorkers(expectedVmNames: string[]): Promise<string[]>;

  abstract forceResetHive(): Promise<string[]>;
  
  abstract testWorkerLogin(vmName: string): Promise<boolean>;
  
  abstract checkCloudInitStatus(vmName: string): Promise<{
    cloudInitExists: boolean;
    cloudInitComplete: boolean;
    networkConfigured: boolean;
    sshConfigured: boolean;
  }>;
  
  abstract diagnoseWorkerNetwork(vmName: string, expectedIp: string, bridgeName: string): Promise<{
    vmRunning: boolean;
    vmInterfaces: string[];
    vmHasInterface: boolean;
    vnetExists: boolean;
    vnetConnectedToBridge: boolean;
    vmConsoleAccessible: boolean;
    cloudInitComplete: boolean;
    dhcpRequestVisible: boolean;
  }>;
}
