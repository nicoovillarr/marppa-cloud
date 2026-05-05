import type { WorkerFlavor, WorkerImage } from '@marppa-cloud/db';

export type WorkerImageSource = Pick<WorkerImage, 'osType' | 'osFamily' | 'osVersion' | 'imageUrl'>;
export type WorkerInstanceSource = Pick<WorkerFlavor, 'ramMB' | 'cpuCores' | 'diskGB'>;

export interface IHiveService {
  workerImagePath(workerImage: WorkerImageSource): string;
  ensureWorkerImageExists(workerImage: WorkerImageSource): Promise<boolean>;
  createWorker(id: string, name: string, mac: string, workerImage: WorkerImageSource, workerInstance: WorkerInstanceSource, publicSshKeys: string[]): Promise<void>;
  addSerialConsoleToGrub(imgPath: string): Promise<void>;
  addSerialTTYToSecuretty(imgPath: string): Promise<void>;
  createCloudInitISO(id: string, name: string, mac: string, destDir: string, sshPublicKeys: string[]): Promise<string>;
  defineVM(name: string, memory: number, cpus: number, size: number, imgPath: string, seedIsoPath: string): Promise<void>;
  stopWorker(vmName: string): Promise<void>;
  forceStopWorker(vmName: string): Promise<void>;
  startWorker(vmName: string): Promise<void>;
  deleteWorker(vmName: string): Promise<void>;
  editWorkerZone(vmName: string, bridgeName?: string | null, mac?: string | null): Promise<void>;
  editWorkerMemory(vmName: string, newMemoryMb: number): Promise<void>;
  editWorkerCpus(vmName: string, newVcpus: number): Promise<void>;
  editWorkerDiskSpace(vmName: string, newDiskSizeGb: number): Promise<void>;
  isBridgeInUse(bridgeName: string): Promise<boolean>;
  isWorkerRunning(vmName: string): Promise<boolean>;
  getWorkerVnet(vmName: string, bridgeName?: string | null): Promise<string | null>;
  getDefinedWorkers(): Promise<string[]>;
  forceResetHive(): Promise<void>;
  testWorkerLogin(vmName: string): Promise<boolean>;
  checkCloudInitStatus(vmName: string): Promise<{
    cloudInitExists: boolean;
    cloudInitComplete: boolean;
    networkConfigured: boolean;
    sshConfigured: boolean;
  }>;
  diagnoseWorkerNetwork(vmName: string, expectedIp: string, bridgeName: string): Promise<{
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
