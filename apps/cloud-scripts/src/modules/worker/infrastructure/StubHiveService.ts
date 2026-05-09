import { IHiveService, type WorkerImageSource, type WorkerInstanceSource } from './IHiveService';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
export class StubHiveService extends IHiveService {
  workerImagePath(workerImage: WorkerImageSource): string {
    return `/stub/images/${workerImage.osType}-${workerImage.osFamily}-${workerImage.osVersion}.img`.toLowerCase();
  }

  async ensureWorkerImageExists(workerImage: WorkerImageSource): Promise<boolean> {
    console.log(`[STUB] ensureWorkerImageExists: ${this.workerImagePath(workerImage)}`);
    return true;
  }

  async createWorker(id: string, name: string, mac: string, _workerImage: WorkerImageSource, _workerInstance: WorkerInstanceSource, _publicSshKeys: string[]): Promise<void> {
    console.log(`[STUB] createWorker: id=${id} name=${name} mac=${mac}`);
  }

  async addSerialConsoleToGrub(imgPath: string): Promise<void> {
    console.log(`[STUB] addSerialConsoleToGrub: ${imgPath}`);
  }

  async addSerialTTYToSecuretty(imgPath: string): Promise<void> {
    console.log(`[STUB] addSerialTTYToSecuretty: ${imgPath}`);
  }

  async createCloudInitISO(id: string, name: string, _mac: string, destDir: string, _sshPublicKeys: string[]): Promise<string> {
    const isoPath = `/stub/cloud-init/${destDir}/seed-${id}.iso`;
    console.log(`[STUB] createCloudInitISO: vm=${name} path=${isoPath}`);
    return isoPath;
  }

  async defineVM(name: string, memory: number, cpus: number, size: number, _imgPath: string, _seedIsoPath: string): Promise<void> {
    console.log(`[STUB] defineVM: name=${name} memory=${memory}MB cpus=${cpus} size=${size}GB`);
  }

  async stopWorker(vmName: string): Promise<void> {
    console.log(`[STUB] stopWorker: ${vmName}`);
  }

  async forceStopWorker(vmName: string): Promise<void> {
    console.log(`[STUB] forceStopWorker: ${vmName}`);
  }

  async startWorker(vmName: string): Promise<void> {
    console.log(`[STUB] startWorker: ${vmName}`);
  }

  async deleteWorker(vmName: string): Promise<void> {
    console.log(`[STUB] deleteWorker: ${vmName}`);
  }

  async editWorkerZone(vmName: string, bridgeName?: string | null, mac?: string | null): Promise<void> {
    console.log(`[STUB] editWorkerZone: vm=${vmName} bridge=${bridgeName} mac=${mac}`);
  }

  async editWorkerMemory(vmName: string, newMemoryMb: number): Promise<void> {
    console.log(`[STUB] editWorkerMemory: vm=${vmName} memory=${newMemoryMb}MB`);
  }

  async editWorkerCpus(vmName: string, newVcpus: number): Promise<void> {
    console.log(`[STUB] editWorkerCpus: vm=${vmName} vcpus=${newVcpus}`);
  }

  async editWorkerDiskSpace(vmName: string, newDiskSizeGb: number): Promise<void> {
    console.log(`[STUB] editWorkerDiskSpace: vm=${vmName} size=${newDiskSizeGb}GB`);
  }

  async isBridgeInUse(bridgeName: string): Promise<boolean> {
    console.log(`[STUB] isBridgeInUse: ${bridgeName} → false`);
    return false;
  }

  async isWorkerRunning(vmName: string): Promise<boolean> {
    console.log(`[STUB] isWorkerRunning: ${vmName} → false`);
    return false;
  }

  async getWorkerVnet(vmName: string, bridgeName?: string | null): Promise<string | null> {
    const vnet = 'vnet0';
    console.log(`[STUB] getWorkerVnet: vm=${vmName} bridge=${bridgeName} → ${vnet}`);
    return vnet;
  }

  async getDefinedWorkers(): Promise<string[]> {
    console.log('[STUB] getDefinedWorkers → []');
    return [];
  }

  async forceResetHive(): Promise<void> {
    console.log('[STUB] forceResetHive');
  }

  async testWorkerLogin(vmName: string): Promise<boolean> {
    console.log(`[STUB] testWorkerLogin: ${vmName} → true`);
    return true;
  }

  async checkCloudInitStatus(vmName: string): Promise<{
    cloudInitExists: boolean;
    cloudInitComplete: boolean;
    networkConfigured: boolean;
    sshConfigured: boolean;
  }> {
    console.log(`[STUB] checkCloudInitStatus: ${vmName}`);
    return { cloudInitExists: true, cloudInitComplete: true, networkConfigured: true, sshConfigured: true };
  }

  async diagnoseWorkerNetwork(vmName: string, expectedIp: string, bridgeName: string): Promise<{
    vmRunning: boolean;
    vmInterfaces: string[];
    vmHasInterface: boolean;
    vnetExists: boolean;
    vnetConnectedToBridge: boolean;
    vmConsoleAccessible: boolean;
    cloudInitComplete: boolean;
    dhcpRequestVisible: boolean;
  }> {
    console.log(`[STUB] diagnoseWorkerNetwork: vm=${vmName} ip=${expectedIp} bridge=${bridgeName}`);
    return {
      vmRunning: true,
      vmInterfaces: ['vnet0'],
      vmHasInterface: true,
      vnetExists: true,
      vnetConnectedToBridge: true,
      vmConsoleAccessible: true,
      cloudInitComplete: true,
      dhcpRequestVisible: true,
    };
  }
}
