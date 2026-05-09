import type { WorkerFlavor, WorkerImage } from '@marppa-cloud/db';

export type WorkerImageSource = Pick<WorkerImage, 'osType' | 'osFamily' | 'osVersion' | 'imageUrl'>;
export type WorkerInstanceSource = Pick<WorkerFlavor, 'ramMB' | 'cpuCores' | 'diskGB'>;

export abstract class IHiveService {
  abstract workerImagePath(workerImage: WorkerImageSource): string;
  abstract ensureWorkerImageExists(workerImage: WorkerImageSource): Promise<boolean>;
  abstract createWorker(id: string, name: string, mac: string, workerImage: WorkerImageSource, workerInstance: WorkerInstanceSource, publicSshKeys: string[]): Promise<void>;
  abstract addSerialConsoleToGrub(imgPath: string): Promise<void>;
  abstract addSerialTTYToSecuretty(imgPath: string): Promise<void>;
  abstract createCloudInitISO(id: string, name: string, mac: string, destDir: string, sshPublicKeys: string[]): Promise<string>;
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
  abstract forceResetHive(): Promise<void>;
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
