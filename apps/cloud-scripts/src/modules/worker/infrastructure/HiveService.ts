import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { Command } from '@/libs/Command';
import { sleep } from '@/libs/sleep';
import {
  IHiveService,
  type WorkerImageSource,
  type WorkerInstanceSource,
} from './IHiveService';
import { Utils } from '@/libs/Utils';
import { Injectable } from '@/decorators/Injectable';

const IMAGE_DIR = '/var/lib/libvirt/images';
const CLOUD_INIT_DIR_BASE = '/var/lib/libvirt/cloud-init';

const SAFE_VM_NAME = /^[a-zA-Z0-9_-]+$/;

@Injectable()
export class HiveService extends IHiveService {
  private validateVmName(vmName: string): void {
    if (!SAFE_VM_NAME.test(vmName)) {
      throw new Error(`Invalid VM name: ${vmName}`);
    }
  }

  workerImagePath(workerImage: WorkerImageSource): string {
    return path.join(
      IMAGE_DIR,
      `${workerImage.osType}-${workerImage.osFamily}-${workerImage.osVersion}.img`.toLowerCase(),
    );
  }

  async ensureWorkerImageExists(
    workerImage: WorkerImageSource,
  ): Promise<boolean> {
    try {
      const name = this.workerImagePath(workerImage);
      const url = workerImage.imageUrl;

      console.log(`Ensuring worker image exists at: ${name}`);

      if (!fs.existsSync(name)) {
        console.log(`Downloading worker image from: ${url}`);
        await Command.runCommand('wget', ['-O', name, '-c', url]);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async createWorker(
    id: string,
    name: string,
    mac: string,
    workerImage: WorkerImageSource,
    workerInstance: WorkerInstanceSource,
    publicSshKeys: string[],
  ): Promise<void> {
    if (
      id == null ||
      name == null ||
      mac == null ||
      workerImage == null ||
      workerInstance == null
    )
      throw new TypeError(
        'name, mac, workerImage and workerInstance are required',
      );

    if (!Array.isArray(publicSshKeys) || publicSshKeys.length === 0) {
      throw new TypeError('At least one public SSH key is required');
    }

    const { ramMB: memory, cpuCores: cpus, diskGB: size } = workerInstance;

    const baseImgPath = this.workerImagePath(workerImage);
    if (!fs.existsSync(baseImgPath)) {
      throw new Error(`Base image not found at ${baseImgPath}`);
    }

    const imgPath = path.join(IMAGE_DIR, `${id}.img`);
    if (fs.existsSync(imgPath)) {
      throw new Error(`Worker disk image already exists at ${imgPath}`);
    }

    const cloudInitPath = path.join(CLOUD_INIT_DIR_BASE, id);
    await fsPromises.mkdir(cloudInitPath, { recursive: true });

    await Command.runCommand('cp', [baseImgPath, imgPath]);

    await this.addSerialConsoleToGrub(imgPath);

    await this.addSerialTTYToSecuretty(imgPath);

    const isoPath = await this.createCloudInitISO(
      id,
      name,
      mac,
      cloudInitPath,
      publicSshKeys,
    );

    await this.defineVM(id, memory, cpus, size, imgPath, isoPath);
  }

  async addSerialConsoleToGrub(imgPath: string): Promise<void> {
    console.log(`Adding serial console to GRUB for image: ${imgPath}`);

    const tmpDir = await fsPromises.mkdtemp('/tmp/grub-edit-');
    await Command.runCommand('sudo', [
      'guestfish',
      '--rw',
      '-a',
      imgPath,
      '-i',
      'copy-out',
      '/etc/default/grub',
      tmpDir,
    ]);

    const grubPath = path.join(tmpDir, 'grub');
    const userName = process.env.USERNAME ?? process.env.USER;
    await Command.runCommand('sudo', [
      'chown',
      `${userName}:${userName}`,
      grubPath,
    ]);

    let content = await fsPromises.readFile(grubPath, 'utf8');
    if (!content.includes('console=ttyS0')) {
      content = content.replace(
        /GRUB_CMDLINE_LINUX="([^"]*)"/,
        (_, g1) => `GRUB_CMDLINE_LINUX="${g1} console=ttyS0"`,
      );
      await fsPromises.writeFile(grubPath, content);
    }

    console.log(`Inserting modified GRUB configuration into image: ${imgPath}`);

    await Command.runCommand('sudo', [
      'guestfish',
      '--rw',
      '-a',
      imgPath,
      '-i',
      'copy-in',
      grubPath,
      '/etc/default/',
    ]);

    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  }

  async addSerialTTYToSecuretty(imgPath: string): Promise<void> {
    console.log(`Adding serial TTY to securetty for image: ${imgPath}`);

    const existing = await Command.runCommand('sudo', [
      'guestfish',
      '--ro',
      '-a',
      imgPath,
      '-i',
      'read-file',
      '/etc/securetty',
    ]).catch(() => '');

    if (existing.includes('ttyS0')) {
      console.log('ttyS0 already in /etc/securetty, skipping');
      return;
    }

    await Command.runCommand('sudo', [
      'guestfish',
      '--rw',
      '-a',
      imgPath,
      '-i',
      'write-append',
      '/etc/securetty',
      'ttyS0\n',
    ]);
  }

  async createCloudInitISO(
    id: string,
    name: string,
    mac: string,
    destDir: string,
    sshPublicKeys: string[],
  ): Promise<string> {
    console.log(`Creating cloud-init ISO for VM: ${name}`);

    await fsPromises.mkdir(destDir, { recursive: true });

    const sshKeysYaml =
      sshPublicKeys.length > 0
        ? `ssh_authorized_keys:\n${sshPublicKeys
            .map((k) => `      - ${k.trim()}`)
            .join('\n')}`
        : '';

    const userData = `#cloud-config
hostname: ${name}
ssh_pwauth: false
users:
  - name: ubuntu
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    shell: /bin/bash
    lock_passwd: true
    ${sshKeysYaml}

  - name: root
    lock_passwd: true

package_update: true
package_upgrade: true

packages:
  - cloud-guest-utils
  - nginx
  - curl
  - git
  - ufw
  - vim
  - iputils-ping

runcmd:
  - [ cloud-init-per, once, resize-root, resize2fs, /dev/vda1 ]
  - [ systemctl, enable, ssh ]
  - [ systemctl, start, ssh ]
  - [ systemctl, start, nginx ]
  - [ ufw, allow, 22/tcp ]
  - [ ufw, allow, 80/tcp ]
  - [ ufw, enable ]
  - [ setcap, cap_net_raw+ep, /usr/bin/ping ]
  - [ sh, -c, "echo 'VM ready - $(date)' > /home/ubuntu/ready.txt" ]

final_message: "Cloud-init finished. SSH should be available."`;

    console.log(userData);

    const metaData = `instance-id: ${name}
local-hostname: ${name}
`;

    const networkConfig = `network:
version: 2
renderer: networkd
ethernets:
  id0:
    match:
      macaddress: "${mac}"
    set-name: eth0
    dhcp4: true
`;

    await Promise.all([
      fsPromises.writeFile(`${destDir}/user-data`, userData),
      fsPromises.writeFile(`${destDir}/meta-data`, metaData),
      fsPromises.writeFile(`${destDir}/network-config`, networkConfig),
    ]);

    const isoPath = path.join(destDir, `seed-${id}.iso`);

    console.log(`Creating ISO at: ${isoPath}`);

    await Command.runCommand('sudo', [
      'genisoimage',
      '-output',
      isoPath,
      '-volid',
      'cidata',
      '-joliet',
      '-rock',
      `${destDir}/user-data`,
      `${destDir}/meta-data`,
      `${destDir}/network-config`,
    ]);

    await Command.runCommand('sudo', ['chmod', '644', isoPath]);
    await Command.runCommand('sudo', ['chown', 'libvirt-qemu:kvm', isoPath]);

    return isoPath;
  }

  async defineVM(
    name: string,
    memory: number,
    cpus: number,
    size: number,
    imgPath: string,
    seedIsoPath: string,
  ): Promise<void> {
    console.log(
      `Defining VM: ${name} with memory: ${memory}MB, cpus: ${cpus}, size: ${size}GB`,
    );

    const xml = await Command.runCommand('sudo', [
      'virt-install',
      '--name',
      name,
      '--memory',
      String(memory),
      '--vcpus',
      String(cpus),
      '--disk',
      `path=${imgPath},format=qcow2,size=${size}`,
      '--disk',
      `path=${seedIsoPath},device=cdrom`,
      '--os-variant',
      'ubuntu-lts-latest',
      '--virt-type',
      'kvm',
      '--graphics',
      'none',
      '--console',
      'pty,target_type=serial',
      '--import',
      '--network',
      `none`,
      '--noautoconsole',
      '--noreboot',
      '--print-xml',
    ]);

    const xmlPath = `/tmp/${name}.xml`;
    await fsPromises.writeFile(xmlPath, xml);
    await Command.runCommand('sudo', ['virsh', 'define', xmlPath]);
    await fsPromises.rm(xmlPath, { force: true });
  }

  async stopWorker(vmName: string): Promise<void> {
    await Command.runCommand('sudo', ['virsh', 'shutdown', `${vmName}`]);
  }

  async forceStopWorker(vmName: string): Promise<void> {
    await Command.runCommand('sudo', ['virsh', 'destroy', `${vmName}`]);
  }

  async startWorker(vmName: string): Promise<void> {
    await Command.runCommand('sudo', ['virsh', 'start', `${vmName}`]);
  }

  async deleteWorker(vmName: string): Promise<void> {
    console.log(`Deleting worker VM: ${vmName}`);

    await Command.runCommand('sudo', [
      'virsh',
      'undefine',
      `${vmName}`,
      '--remove-all-storage',
    ]);

    await fsPromises.rm(path.join(CLOUD_INIT_DIR_BASE, vmName), {
      recursive: true,
      force: true,
    });

    await fsPromises.rm(path.join(IMAGE_DIR, `${vmName}.img`), { force: true });
  }

  async editWorkerZone(
    vmName: string,
    bridgeName?: string | null,
    mac?: string | null,
  ): Promise<void> {
    console.log(
      `Editing worker zone for ${vmName}, bridge: ${bridgeName}, mac: ${mac}`,
    );

    const xmlRaw = await Command.runCommand('sudo', [
      'virsh',
      'dumpxml',
      vmName,
    ]);

    let newXml = xmlRaw.replace(/<interface[\s\S]*?<\/interface>/g, '');

    if (bridgeName && mac) {
      const interfaceXml = `
  <interface type='bridge'>
    <mac address='${Utils.escapeXml(mac)}'/>
    <source bridge='${Utils.escapeXml(bridgeName)}'/>
    <model type='virtio'/>
    <driver name='vhost' queues='2'/>
  </interface>`;

      newXml = newXml.replace(/<\/devices>/, `${interfaceXml}\n  </devices>`);
    } else {
      console.log(
        `No bridge or MAC provided, removing network interface from ${vmName}`,
      );

      newXml = newXml.replace(/<\/devices>/, `\n  </devices>`);
    }

    const tmpPath = `/tmp/${vmName}-net.xml`;
    await fsPromises.writeFile(tmpPath, newXml);

    await Command.runCommand('sudo', ['virsh', 'define', tmpPath]);
    await fsPromises.rm(tmpPath, { force: true });

    console.log(`Network configuration updated for ${vmName}`);
  }

  async editWorkerMemory(vmName: string, newMemoryMb: number): Promise<void> {
    await Command.runCommand('sudo', [
      'virsh',
      'setmem',
      vmName,
      String(newMemoryMb * 1024),
      '--config',
    ]);
  }

  async editWorkerCpus(vmName: string, newVcpus: number): Promise<void> {
    await Command.runCommand('sudo', [
      'virsh',
      'setvcpus',
      vmName,
      String(newVcpus),
      '--config',
    ]);
  }

  async editWorkerDiskSpace(
    vmName: string,
    newDiskSizeGb: number,
  ): Promise<void> {
    const diskPath = path.join(IMAGE_DIR, `${vmName}.img`);

    const info = await Command.runCommand('qemu-img', [
      'info',
      '--output=json',
      diskPath,
    ]);
    const currentBytes = JSON.parse(info)['virtual-size'];
    const currentGb = currentBytes / 1024 ** 3;

    if (newDiskSizeGb <= currentGb) {
      throw new Error(
        `Cannot shrink disk: current size is ${currentGb.toFixed(1)}GB, requested ${newDiskSizeGb}GB`,
      );
    }

    await Command.runCommand('qemu-img', [
      'resize',
      diskPath,
      `${newDiskSizeGb}G`,
    ]);
  }

  async isBridgeInUse(bridgeName: string): Promise<boolean> {
    const vmListRaw = await Command.runCommand('virsh', [
      'list',
      '--all',
      '--name',
    ]);
    const vmNames = vmListRaw.split('\n').filter(Boolean);

    for (const name of vmNames) {
      const dumpxml = await Command.runCommand('virsh', ['dumpxml', name]);
      if (dumpxml.includes(`<source bridge='${bridgeName}'`)) {
        return true;
      }
    }

    return false;
  }

  async isWorkerRunning(vmName: string): Promise<boolean> {
    const status = await Command.runCommand('sudo', [
      'virsh',
      'domstate',
      vmName,
    ]);
    return status.trim() === 'running';
  }

  async getWorkerVnet(
    vmName: string,
    bridgeName?: string | null,
  ): Promise<string | null> {
    const vnetInfo = await Command.runCommand(
      'sudo',
      ['virsh', 'domiflist', vmName],
      true,
    );
    console.log(`VNet info for ${vmName}\n`, vnetInfo);

    const vnetLine = vnetInfo
      .split('\n')
      .find((line) => line.includes('bridge') && line.includes(bridgeName));

    console.log(`VNet line for ${vmName} with bridge ${bridgeName}:`, vnetLine);

    if (vnetLine) {
      const parts = vnetLine.trim().split(/\s+/);
      return parts[0];
    }

    return null;
  }

  async getDefinedWorkers(): Promise<string[]> {
    console.log('Fetching defined worker VMs...');

    const response = await Command.runCommand('sudo', [
      'virsh',
      'list',
      '--all',
    ]);
    const lines = response.split('\n').filter(Boolean);

    const vmNameRegex = /(w-\S+)/;
    const vmNames = [];

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(vmNameRegex);
      if (match && match[1]) {
        vmNames.push(match[1]);
      }
    }

    return vmNames;
  }

  async forceResetHive() {
    const workers = await this.getDefinedWorkers();

    for (const worker of workers) {
      try {
        if (await this.isWorkerRunning(worker)) {
          await this.forceStopWorker(worker);
          await sleep(500);
        }

        await this.deleteWorker(worker);
      } catch (error) {
        console.error(`Failed to delete worker ${worker}:`, error);
      }
    }
  }

  async testWorkerLogin(vmName: string): Promise<boolean> {
    this.validateVmName(vmName);
    try {
      console.log(`Testing login to worker VM: ${vmName}`);

      const result = await Command.runCommand('timeout', [
        '10',
        'bash',
        '-c',
        `echo 'ubuntu' | sudo virsh console ${vmName} --force 2>&1 | grep -E "(login|ubuntu@|#|$)"`,
      ]);

      return result.includes('ubuntu@') || result.includes('#');
    } catch (error) {
      console.log(`Login test failed for ${vmName}: ${error.message}`);
      return false;
    }
  }

  async checkCloudInitStatus(vmName: string): Promise<{
    cloudInitExists: boolean;
    cloudInitComplete: boolean;
    networkConfigured: boolean;
    sshConfigured: boolean;
  }> {
    this.validateVmName(vmName);
    const status = {
      cloudInitExists: false,
      cloudInitComplete: false,
      networkConfigured: false,
      sshConfigured: false,
    };

    try {
      const consoleOutput = await Command.runCommand('timeout', [
        '15',
        'bash',
        '-c',
        `echo "" | sudo virsh console ${vmName} --force 2>&1 | head -20`,
      ]);

      status.cloudInitExists =
        consoleOutput.includes('cloud-init') ||
        consoleOutput.includes('ubuntu');
      status.cloudInitComplete =
        consoleOutput.includes('login:') || consoleOutput.includes('ubuntu@');

      const dhcpLogs = await Command.runCommand('journalctl', [
        '-u',
        'dnsmasq',
        '--since',
        '5 minutes ago',
        '-q',
      ]);
      status.networkConfigured =
        dhcpLogs.includes('DHCP') && dhcpLogs.includes(vmName);
    } catch (error) {
      console.log(`Could not check cloud-init status: ${error.message}`);
    }

    return status;
  }

  async diagnoseWorkerNetwork(
    vmName: string,
    expectedIp: string,
    bridgeName: string,
  ): Promise<{
    vmRunning: boolean;
    vmInterfaces: string[];
    vmHasInterface: boolean;
    vnetExists: boolean;
    vnetConnectedToBridge: boolean;
    vmConsoleAccessible: boolean;
    cloudInitComplete: boolean;
    dhcpRequestVisible: boolean;
  }> {
    this.validateVmName(vmName);
    const diagnostics = {
      vmRunning: false,
      vmInterfaces: [],
      vmHasInterface: false,
      vnetExists: false,
      vnetConnectedToBridge: false,
      vmConsoleAccessible: false,
      cloudInitComplete: false,
      dhcpRequestVisible: false,
    };

    try {
      diagnostics.vmRunning = await this.isWorkerRunning(vmName);

      try {
        const iflist = await Command.runCommand('sudo', [
          'virsh',
          'domiflist',
          vmName,
        ]);
        diagnostics.vmInterfaces = iflist.split('\n').filter(Boolean);
        diagnostics.vmHasInterface =
          iflist.includes('bridge') && iflist.includes(bridgeName);
      } catch (e) {
        console.log('Could not get VM interfaces:', e.message);
      }

      if (diagnostics.vmRunning) {
        const vnet = await this.getWorkerVnet(vmName, bridgeName);
        diagnostics.vnetExists = !!vnet;

        if (vnet) {
          try {
            const vnetStatus = await Command.runCommand('ip', [
              'link',
              'show',
              vnet,
            ]);
            diagnostics.vnetConnectedToBridge = vnetStatus.includes(
              `master ${bridgeName}`,
            );
            console.log(`VNet ${vnet} status: ${vnetStatus.split('\n')[0]}`);
          } catch (e) {
            console.log('Could not check vnet bridge connection:', e.message);
          }
        }
      }

      try {
        if (diagnostics.vmRunning) {
          const consoleTest = await Command.runCommand('timeout', [
            '5',
            'bash',
            '-c',
            `echo "" | sudo virsh console ${vmName} --force 2>&1 | head -10`,
          ]);
          diagnostics.vmConsoleAccessible = !consoleTest.includes('error');

          if (
            consoleTest.includes('login:') ||
            consoleTest.includes('ubuntu@')
          ) {
            diagnostics.cloudInitComplete = true;
          }
        }
      } catch (e) {
        diagnostics.vmConsoleAccessible = false;
      }

      try {
        const logs = await Command.runCommand('journalctl', [
          '-u',
          'dnsmasq',
          '--since',
          '2 minutes ago',
          '-q',
        ]);
        diagnostics.dhcpRequestVisible =
          logs.includes('DHCP') &&
          (logs.includes(expectedIp) || logs.includes(bridgeName));
      } catch (e) {
        console.log('Could not check dnsmasq logs:', e.message);
      }
    } catch (error) {
      console.error(
        `Error during worker network diagnostics: ${error.message}`,
      );
    }

    return diagnostics;
  }
}
