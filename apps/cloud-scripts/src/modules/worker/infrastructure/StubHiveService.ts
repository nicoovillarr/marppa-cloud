import { HiveService, type WorkerImageSource, type WorkerInstanceSource, type WorkerNetworkConfig } from '../domain/services/HiveService';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
export class StubHiveService extends HiveService {
  public async ensureWorkerImageExists(workerImage: WorkerImageSource): Promise<boolean> {
    console.log(`[STUB] ensureWorkerImageExists: ${this.workerImagePath(workerImage)}`);
    return true;
  }

  public async createWorker(id: string, name: string, mac: string, _workerImage: WorkerImageSource, _workerInstance: WorkerInstanceSource, _publicSshKeys: string[], _consolePassword: string): Promise<void> {
    console.log(`[STUB] createWorker: id=${id} name=${name} mac=${mac}`);
  }

  public async addSerialConsoleToGrub(imgPath: string): Promise<void> {
    console.log(`[STUB] addSerialConsoleToGrub: ${imgPath}`);
  }

  public async addSerialTTYToSecuretty(imgPath: string): Promise<void> {
    console.log(`[STUB] addSerialTTYToSecuretty: ${imgPath}`);
  }

  public async createCloudInitISO(id: string, name: string, _mac: string, destDir: string, _sshPublicKeys: string[], _consolePassword: string, net?: WorkerNetworkConfig): Promise<string> {
    const isoPath = `/stub/cloud-init/${destDir}/seed-${id}.iso`;
    console.log(`[STUB] createCloudInitISO: vm=${name} path=${isoPath} net=${net ? `${net.ipAddress}/${net.prefix}` : 'dhcp'}`);
    return isoPath;
  }

  public async rearmCloudInitISO(id: string, name: string, _mac: string, net: WorkerNetworkConfig): Promise<string> {
    const isoPath = `/stub/cloud-init/${id}/seed-${id}.iso`;
    console.log(`[STUB] rearmCloudInitISO: vm=${name} path=${isoPath} net=${net.ipAddress}/${net.prefix}`);
    return isoPath;
  }

  public async defineVM(name: string, memory: number, cpus: number, size: number, _imgPath: string, _seedIsoPath: string): Promise<void> {
    console.log(`[STUB] defineVM: name=${name} memory=${memory}MB cpus=${cpus} size=${size}GB`);
  }

  public async stopWorker(vmName: string): Promise<void> {
    console.log(`[STUB] stopWorker: ${vmName}`);
  }

  public async forceStopWorker(vmName: string): Promise<void> {
    console.log(`[STUB] forceStopWorker: ${vmName}`);
  }

  public async startWorker(vmName: string): Promise<void> {
    console.log(`[STUB] startWorker: ${vmName}`);
  }

  public async deleteWorker(vmName: string): Promise<boolean> {
    console.log(`[STUB] deleteWorker: ${vmName}`);
    return true;
  }

  public async editWorkerZone(vmName: string, bridgeName?: string | null, mac?: string | null): Promise<void> {
    console.log(`[STUB] editWorkerZone: vm=${vmName} bridge=${bridgeName} mac=${mac}`);
  }

  public async editWorkerMemory(vmName: string, newMemoryMb: number): Promise<void> {
    console.log(`[STUB] editWorkerMemory: vm=${vmName} memory=${newMemoryMb}MB`);
  }

  public async editWorkerCpus(vmName: string, newVcpus: number): Promise<void> {
    console.log(`[STUB] editWorkerCpus: vm=${vmName} vcpus=${newVcpus}`);
  }

  public async editWorkerDiskSpace(vmName: string, newDiskSizeGb: number): Promise<void> {
    console.log(`[STUB] editWorkerDiskSpace: vm=${vmName} size=${newDiskSizeGb}GB`);
  }

  public async createWorkerVolume(volumeId: number, sizeGiB: number): Promise<string> {
    const volumePath = `/var/lib/libvirt/images/volumes/vol-${volumeId}.qcow2`;
    console.log(`[STUB] createWorkerVolume: id=${volumeId} size=${sizeGiB}GiB → ${volumePath}`);
    return volumePath;
  }

  public async deleteWorkerVolume(volumePath: string): Promise<boolean> {
    console.log(`[STUB] deleteWorkerVolume: ${volumePath} → true`);
    return true;
  }

  public async nextVolumeDeviceTarget(vmName: string): Promise<string> {
    console.log(`[STUB] nextVolumeDeviceTarget: vm=${vmName} → vdb`);
    return 'vdb';
  }

  public async attachWorkerVolume(vmName: string, volumePath: string, deviceTarget: string, mountPoint: string): Promise<void> {
    console.log(`[STUB] attachWorkerVolume: vm=${vmName} volume=${volumePath} target=${deviceTarget} mount=${mountPoint}`);
  }

  public async detachWorkerVolume(vmName: string, volumePath: string, deviceTarget: string, mountPoint: string): Promise<void> {
    console.log(`[STUB] detachWorkerVolume: vm=${vmName} volume=${volumePath} target=${deviceTarget} mount=${mountPoint}`);
  }

  public async isBridgeInUse(bridgeName: string): Promise<boolean> {
    console.log(`[STUB] isBridgeInUse: ${bridgeName} → false`);
    return false;
  }

  public async isWorkerRunning(vmName: string): Promise<boolean> {
    console.log(`[STUB] isWorkerRunning: ${vmName} → false`);
    return false;
  }

  public async getWorkerVnet(vmName: string, bridgeName?: string | null): Promise<string | null> {
    const vnet = 'vnet0';
    console.log(`[STUB] getWorkerVnet: vm=${vmName} bridge=${bridgeName} → ${vnet}`);
    return vnet;
  }

  public async getDefinedWorkers(): Promise<string[]> {
    console.log('[STUB] getDefinedWorkers → []');
    return [];
  }

  public async getRunningWorkers(): Promise<string[]> {
    console.log('[STUB] getRunningWorkers → []');
    return [];
  }

  public async isGuestAgentReachable(vmName: string): Promise<boolean> {
    console.log(`[STUB] isGuestAgentReachable: ${vmName}`);
    return true;
  }

  public async applySshKeys(vmName: string, publicKeys: string[]): Promise<void> {
    console.log(`[STUB] applySshKeys: ${vmName} (${publicKeys.length} keys)`);
  }

  public async applySshKeysOffline(vmName: string, publicKeys: string[]): Promise<void> {
    console.log(`[STUB] applySshKeysOffline: ${vmName} (${publicKeys.length} keys)`);
  }

  public async reconcileWorkers(expectedVmNames: string[]): Promise<string[]> {
    console.log(`[STUB] reconcileWorkers: ${expectedVmNames.length} expected`);
    return [];
  }

  public async forceResetHive(): Promise<string[]> {
    console.log('[STUB] forceResetHive');
    return [];
  }

  public async testWorkerLogin(vmName: string): Promise<boolean> {
    console.log(`[STUB] testWorkerLogin: ${vmName} → true`);
    return true;
  }

  public async checkCloudInitStatus(vmName: string): Promise<{
    cloudInitExists: boolean;
    cloudInitComplete: boolean;
    networkConfigured: boolean;
    sshConfigured: boolean;
  }> {
    console.log(`[STUB] checkCloudInitStatus: ${vmName}`);
    return { cloudInitExists: true, cloudInitComplete: true, networkConfigured: true, sshConfigured: true };
  }

  public async diagnoseWorkerNetwork(vmName: string, expectedIp: string, bridgeName: string): Promise<{
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
  
  private workerImagePath(workerImage: WorkerImageSource): string {
    return `/stub/images/${workerImage.osType}-${workerImage.osFamily}-${workerImage.osVersion}.img`.toLowerCase();
  }
}
