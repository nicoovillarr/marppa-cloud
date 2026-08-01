import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { isValidSshPublicKey } from '@marppa-cloud/shared';
import { Command } from '@/libs/Command';
import { sleep } from '@/libs/sleep';
import {
  HiveService,
  type WorkerImageSource,
  type WorkerInstanceSource,
  type WorkerNetworkConfig,
} from '../domain/services/HiveService';
import { Utils } from '@/libs/Utils';
import { Injectable } from '@/decorators/Injectable';

const IMAGE_DIR = '/var/lib/libvirt/images';
const CLOUD_INIT_DIR_BASE = '/var/lib/libvirt/cloud-init';

// Packages baked into the base image at prep time so the first boot needs no Internet.
const BASE_IMAGE_PACKAGES = [
  'cloud-guest-utils',
  'nginx',
  'curl',
  'git',
  'ufw',
  'vim',
  'iputils-ping',
  'qemu-guest-agent',
];

/** Budget for a guest to honour the ACPI shutdown before it is powered off. */
const SHUTDOWN_TIMEOUT_MS = 60_000;
const SHUTDOWN_POLL_MS = 2_000;

const SAFE_VM_NAME = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_IMAGE_URL = /^https?:\/\/[a-zA-Z0-9.\-]+(:\d+)?\//;
const SAFE_USERNAME = /^[a-z_][a-z0-9_-]{0,31}$/;
const SAFE_WORKER_ID = /^[a-zA-Z0-9_-]+$/;

@Injectable()
export class LinuxHiveService extends HiveService {
  public async ensureWorkerImageExists(
    workerImage: WorkerImageSource,
  ): Promise<boolean> {
    const name = this.workerImagePath(workerImage);
    const url = workerImage.imageUrl;

    console.log(`Ensuring worker image exists at: ${name}`);

    if (!fs.existsSync(name)) {
      if (!ALLOWED_IMAGE_URL.test(workerImage.imageUrl)) {
        throw new Error(`Invalid image URL: ${workerImage.imageUrl}`);
      }

      const allowedImageDomains = process.env.ALLOWED_IMAGE_DOMAINS
        ?.split(',')
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean);
      if (allowedImageDomains?.length) {
        const imageHost = new URL(workerImage.imageUrl).hostname.toLowerCase();
        if (!allowedImageDomains.includes(imageHost)) {
          throw new Error(`Image URL domain not allowed: ${imageHost}`);
        }
      }

      console.log(`Downloading worker image from: ${url}`);
      await Command.runCommand('wget', ['-O', name, '-c', url]);
    }

    // Bake packages into the base image once so per-VM first boot needs no Internet.
    await this.prepareBaseImage(name);

    return true;
  }

  /**
   * Golden-image prep: installs the packages every worker needs directly into
   * the base image (one-time, cached via a `.prepared` marker). This removes the
   * first-boot Internet dependency that `apt`-in-cloud-init otherwise imposes
   * (which hangs VMs under forward mode=open). Requires Internet at prep time only.
   */
  private async prepareBaseImage(imgPath: string): Promise<void> {
    const marker = `${imgPath}.prepared`;
    if (fs.existsSync(marker)) {
      return;
    }

    console.log(`Preparing base image (installing packages, one-time): ${imgPath}`);

    await Command.runCommand('sudo', [
      'virt-customize',
      '-a',
      imgPath,
      '--update',
      '--install',
      BASE_IMAGE_PACKAGES.join(','),
      '--run-command',
      'systemctl enable ssh',
      '--run-command',
      'systemctl enable nginx',
      '--run-command',
      'systemctl enable qemu-guest-agent',
      '--run-command',
      'setcap cap_net_raw+ep /usr/bin/ping || true',
    ]);

    await fsPromises.writeFile(marker, new Date().toISOString());
    console.log(`✅ Base image prepared: ${imgPath}`);
  }

  public async createWorker(
    id: string,
    name: string,
    mac: string,
    workerImage: WorkerImageSource,
    workerInstance: WorkerInstanceSource,
    publicSshKeys: string[],
    consolePassword: string,
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

    if (!SAFE_WORKER_ID.test(id)) {
      throw new TypeError(`Invalid worker id: ${id}`);
    }

    if (!Array.isArray(publicSshKeys) || publicSshKeys.length === 0) {
      throw new TypeError('At least one public SSH key is required');
    }

    const { ramMB: memory, cpuCores: cpus, diskGB: size } = workerInstance;

    const baseImgPath = this.workerImagePath(workerImage);
    if (!fs.existsSync(baseImgPath)) {
      throw new Error(`Base image not found at ${baseImgPath}`);
    }

    await this.assertHostDiskAvailable(size);

    const imgPath = path.join(IMAGE_DIR, `${id}.img`);

    // WORKER_CREATE is retried on failure, and a half-finished attempt leaves a
    // disk (and possibly a defined domain) behind. Clearing them makes the retry
    // work instead of failing forever on "already exists". Safe by construction:
    // this event only runs while the worker is QUEUED, i.e. never started.
    await this.discardPartialWorker(id, imgPath);

    const cloudInitPath = path.join(CLOUD_INIT_DIR_BASE, id);
    await fsPromises.mkdir(cloudInitPath, { recursive: true });

    await Command.runCommand('cp', [baseImgPath, imgPath]);

    // The copy inherits the base image's virtual size (~3.5GB), and passing
    // `size=` to virt-install is ignored for an existing file — so the flavor's
    // disk would be silently dropped and the cloud-init `resize2fs` would be a
    // no-op. Grow the disk here, before the VM is defined.
    await this.resizeDiskImage(imgPath, size);

    await this.addSerialConsoleToGrub(imgPath);

    await this.addSerialTTYToSecuretty(imgPath);

    const isoPath = await this.createCloudInitISO(
      id,
      name,
      mac,
      cloudInitPath,
      publicSshKeys,
      consolePassword,
    );

    await this.defineVM(id, memory, cpus, size, imgPath, isoPath);
  }

  private async assertHostDiskAvailable(diskGB: number): Promise<void> {
    const output = await Command.runCommand('df', [
      '--output=avail',
      '--block-size=1G',
      IMAGE_DIR,
    ]);

    const availableGB = Number(output.trim().split('\n').pop()?.trim());
    if (!Number.isFinite(availableGB)) {
      throw new Error(`Could not read available disk on ${IMAGE_DIR}`);
    }

    if (diskGB > availableGB) {
      throw new Error(
        `Not enough disk on ${IMAGE_DIR}: ${diskGB}GB requested, ${availableGB}GB available`,
      );
    }
  }

  private async assertHostMemoryAvailable(vmName: string): Promise<void> {
    const dominfo = await Command.runCommand('sudo', [
      'virsh',
      'dominfo',
      vmName,
    ]);

    const maxMemoryKiB = Number(
      /Max memory:\s+(\d+)\s+KiB/.exec(dominfo)?.[1],
    );
    if (!Number.isFinite(maxMemoryKiB)) {
      throw new Error(`Could not read the configured memory of ${vmName}`);
    }

    const requiredMB = Math.ceil(maxMemoryKiB / 1024);
    const availableMB = await this.hostAvailableMemoryMB();

    if (requiredMB > availableMB) {
      throw new Error(
        `Not enough free memory to start ${vmName}: ${requiredMB}MB required, ${availableMB}MB available`,
      );
    }
  }

  private async hostAvailableMemoryMB(): Promise<number> {
    const output = await Command.runCommand('free', ['-m']);

    const memLine = output
      .split('\n')
      .find((line) => line.trim().startsWith('Mem:'));
    const availableMB = Number(memLine?.trim().split(/\s+/)[6]);

    if (!Number.isFinite(availableMB)) {
      throw new Error('Could not read available host memory');
    }

    return availableMB;
  }

  private async isWorkerDefined(vmName: string): Promise<boolean> {
    try {
      await Command.runCommand('sudo', ['virsh', 'dominfo', vmName]);
      return true;
    } catch {
      return false;
    }
  }

  /** Removes leftovers of a previous failed WORKER_CREATE attempt. */
  private async discardPartialWorker(id: string, imgPath: string): Promise<void> {
    if (await this.isWorkerDefined(id)) {
      if (await this.isWorkerRunning(id)) {
        throw new Error(
          `Refusing to recreate worker ${id}: a domain with that name is running`,
        );
      }

      console.log(`Undefining leftover domain from a previous attempt: ${id}`);
      await Command.runCommand('sudo', ['virsh', 'undefine', id]);
    }

    if (fs.existsSync(imgPath)) {
      console.log(`Removing leftover disk from a previous attempt: ${imgPath}`);
      await Command.runCommand('sudo', ['rm', '-f', imgPath]);
    }
  }

  /**
   * Grows a copied base image to the flavor's disk size. Shrinking is not
   * possible with qcow2, so a flavor smaller than the base image is an error
   * rather than a silently ignored setting.
   */
  private async resizeDiskImage(imgPath: string, sizeGb: number): Promise<void> {
    const info = await Command.runCommand('qemu-img', [
      'info',
      '--output=json',
      imgPath,
    ]);
    const currentGb = JSON.parse(info)['virtual-size'] / 1024 ** 3;

    if (sizeGb < currentGb) {
      throw new Error(
        `Flavor disk (${sizeGb}GB) is smaller than the base image (${currentGb.toFixed(1)}GB); qcow2 cannot shrink`,
      );
    }

    if (sizeGb === currentGb) {
      return;
    }

    console.log(`Resizing ${imgPath}: ${currentGb.toFixed(1)}GB → ${sizeGb}GB`);
    await Command.runCommand('qemu-img', ['resize', imgPath, `${sizeGb}G`]);
  }

  public async addSerialConsoleToGrub(imgPath: string): Promise<void> {
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
    if (!userName || !SAFE_USERNAME.test(userName)) {
      throw new Error(`Invalid USERNAME env var: "${userName}" — must match /^[a-z_][a-z0-9_-]{0,31}$/`);
    }
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

  public async addSerialTTYToSecuretty(imgPath: string): Promise<void> {
    console.log(`Adding serial TTY to securetty for image: ${imgPath}`);

    // /etc/securetty is gone in current Ubuntu cloud images. Appending to a
    // missing file makes guestfish fail and takes WORKER_CREATE down with it,
    // so skip when the image does not use it.
    const exists = (
      await Command.runCommand('sudo', [
        'guestfish', '--ro', '-a', imgPath, '-i', 'exists', '/etc/securetty',
      ]).catch(() => 'false')
    ).trim();

    if (exists !== 'true') {
      console.log('/etc/securetty not present in this image, skipping');
      return;
    }

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

  public async createCloudInitISO(
    id: string,
    name: string,
    mac: string,
    destDir: string,
    sshPublicKeys: string[],
    consolePassword: string,
    net?: WorkerNetworkConfig,
  ): Promise<string> {
    console.log(`Creating cloud-init ISO for VM: ${name}`);

    await fsPromises.mkdir(destDir, { recursive: true });

    if (!SAFE_VM_NAME.test(name)) {
      throw new Error(`Invalid VM hostname: ${name}`);
    }

    for (const key of sshPublicKeys) {
      if (!isValidSshPublicKey(key)) {
        throw new Error(`Invalid SSH public key format: ${key.substring(0, 40)}...`);
      }
    }

    if (!consolePassword || /[\r\n]/.test(consolePassword)) {
      throw new Error('Invalid console password');
    }

    const sshKeysYaml =
      sshPublicKeys.length > 0
        ? `ssh_authorized_keys:\n${sshPublicKeys
            .map((k) => `      - ${k.trim()}`)
            .join('\n')}`
        : '';

    const userData = `#cloud-config
hostname: ${name}
ssh_pwauth: false
chpasswd:
  list: |
    ubuntu:${consolePassword}
  expire: false
users:
  - name: ubuntu
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    shell: /bin/bash
    ${sshKeysYaml}

  - name: root
    lock_passwd: true

# Packages are baked into the base image (see LinuxHiveService.prepareBaseImage),
# so the first boot does NOT run apt and needs no Internet.

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

    await fsPromises.writeFile(`${destDir}/user-data`, userData);

    return this.writeSeedIso(id, name, mac, destDir, net);
  }

  public async rearmCloudInitISO(
    id: string,
    name: string,
    mac: string,
    net: WorkerNetworkConfig,
  ): Promise<string> {
    console.log(`Rearming cloud-init ISO for VM: ${name} with static IP ${net.ipAddress}/${net.prefix}`);

    if (!SAFE_VM_NAME.test(name)) {
      throw new Error(`Invalid VM hostname: ${name}`);
    }

    const destDir = path.join(CLOUD_INIT_DIR_BASE, id);

    // user-data (SSH keys, packages) was written at WORKER_CREATE; reuse it as-is.
    if (!fs.existsSync(`${destDir}/user-data`)) {
      throw new Error(`Cannot rearm cloud-init: user-data missing at ${destDir}`);
    }

    return this.writeSeedIso(id, name, mac, destDir, net);
  }

  private buildNetworkConfig(mac: string, net?: WorkerNetworkConfig): string {
    if (!net) {
      // First boot before the worker has a Node/IP: fall back to DHCP.
      return `network:
  version: 2
  renderer: networkd
  ethernets:
    id0:
      match:
        macaddress: "${mac}"
      set-name: eth0
      dhcp4: true
`;
    }

    // Static IP per runbook §6.3 — robust against systemd-networkd-wait-online
    // hangs that DHCP suffers under forward mode=open.
    return `network:
  version: 2
  renderer: networkd
  ethernets:
    id0:
      match:
        macaddress: "${mac}"
      set-name: eth0
      dhcp4: false
      addresses:
        - ${net.ipAddress}/${net.prefix}
      routes:
        - to: default
          via: ${net.gateway}
      nameservers:
        addresses:
          - ${net.gateway}
          - 1.1.1.1
`;
  }

  private async writeSeedIso(
    id: string,
    name: string,
    mac: string,
    destDir: string,
    net?: WorkerNetworkConfig,
  ): Promise<string> {
    // Versioned instance-id: cloud-init ignores network/config changes unless the
    // instance-id changes, so bump it on every (re)generation of the ISO.
    const metaData = `instance-id: ${name}-${Date.now()}
local-hostname: ${name}
`;

    const networkConfig = this.buildNetworkConfig(mac, net);

    await Promise.all([
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

  public async defineVM(
    name: string,
    memory: number,
    cpus: number,
    size: number,
    imgPath: string,
    seedIsoPath: string,
  ): Promise<void> {
    // Flavors express fractional cores (0.25, 0.5) as a share of a CPU, but a
    // domain can only be given whole vCPUs — `--vcpus 0.5` is a hard error.
    const vcpus = Math.max(1, Math.ceil(cpus));

    console.log(
      `Defining VM: ${name} with memory: ${memory}MB, cpus: ${vcpus} (flavor: ${cpus}), size: ${size}GB`,
    );

    const xml = await Command.runCommand('sudo', [
      'virt-install',
      '--name',
      name,
      '--memory',
      String(memory),
      '--vcpus',
      String(vcpus),
      // No `size=`: the disk was already grown to the flavor size by
      // resizeDiskImage (virt-install ignores size= on an existing file).
      '--disk',
      `path=${imgPath},format=qcow2`,
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

    if (cpus < vcpus) {
      const period = 100000;
      const quota = Math.max(1000, Math.round((cpus / vcpus) * period));
      await Command.runCommand('sudo', [
        'virsh',
        'schedinfo',
        name,
        '--config',
        '--set',
        `vcpu_period=${period}`,
        '--set',
        `vcpu_quota=${quota}`,
      ]);
    }
  }

  /**
   * Graceful ACPI shutdown, then a forced destroy if the guest ignores it.
   * Returning while the VM is still running would leave the DB saying INACTIVE
   * with a live VM — and WORKER_DELETE would then refuse to delete it forever.
   */
  public async stopWorker(vmName: string): Promise<void> {
    this.validateVmName(vmName);

    if (!(await this.isWorkerRunning(vmName))) {
      console.log(`VM ${vmName} is already stopped`);
      return;
    }

    await Command.runCommand('sudo', ['virsh', 'shutdown', vmName]);

    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(SHUTDOWN_POLL_MS);
      if (!(await this.isWorkerRunning(vmName))) {
        console.log(`✓ VM ${vmName} shut down cleanly`);
        return;
      }
    }

    console.warn(
      `VM ${vmName} ignored the ACPI shutdown after ${SHUTDOWN_TIMEOUT_MS}ms; forcing power off`,
    );
    await this.forceStopWorker(vmName);
  }

  private async guestAgentCommand(
    vmName: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const raw = await Command.runCommand('sudo', [
      'virsh',
      'qemu-agent-command',
      vmName,
      JSON.stringify(payload),
    ]);

    return JSON.parse(raw);
  }

  public async isGuestAgentReachable(vmName: string): Promise<boolean> {
    this.validateVmName(vmName);

    try {
      await this.guestAgentCommand(vmName, { execute: 'guest-ping' });
      return true;
    } catch {
      return false;
    }
  }

  private assertPublicKeys(publicKeys: string[]): void {
    for (const key of publicKeys) {
      if (!isValidSshPublicKey(key)) {
        throw new Error(`Refusing to write a malformed SSH public key: ${key}`);
      }
    }
  }

  public async applySshKeys(
    vmName: string,
    publicKeys: string[],
    guestUser = 'ubuntu',
  ): Promise<void> {
    this.validateVmName(vmName);
    this.assertPublicKeys(publicKeys);

    if (!(await this.isWorkerRunning(vmName))) {
      return this.applySshKeysOffline(vmName, publicKeys, guestUser);
    }

    if (!(await this.isGuestAgentReachable(vmName))) {
      throw new Error(
        `qemu-guest-agent is not answering on ${vmName}. The image may predate it, ` +
        'or the agent was stopped inside the guest. Stop the VM and retry: with it ' +
        'off the keys are written straight to the disk, which needs no agent.',
      );
    }

    const path = `/home/${guestUser}/.ssh/authorized_keys`;
    const contents = publicKeys.map((key) => key.trim()).join('\n') + '\n';

    const opened = await this.guestAgentCommand(vmName, {
      execute: 'guest-file-open',
      arguments: { path, mode: 'w' },
    });

    const handle = opened.return;

    try {
      await this.guestAgentCommand(vmName, {
        execute: 'guest-file-write',
        arguments: {
          handle,
          'buf-b64': Buffer.from(contents, 'utf8').toString('base64'),
        },
      });
    } finally {
      await this.guestAgentCommand(vmName, {
        execute: 'guest-file-close',
        arguments: { handle },
      });
    }

    console.log(`Wrote ${publicKeys.length} SSH keys to ${vmName}:${path}`);
  }

  public async applySshKeysOffline(
    vmName: string,
    publicKeys: string[],
    guestUser = 'ubuntu',
  ): Promise<void> {
    this.validateVmName(vmName);
    this.assertPublicKeys(publicKeys);

    if (await this.isWorkerRunning(vmName)) {
      throw new Error(
        `VM ${vmName} is running; editing its disk now would corrupt the filesystem`,
      );
    }

    const diskPath = path.join(IMAGE_DIR, `${vmName}.img`);
    const sshDir = `/home/${guestUser}/.ssh`;
    const tmpPath = path.join(os.tmpdir(), `authorized_keys-${vmName}-${Date.now()}`);

    await fsPromises.writeFile(
      tmpPath,
      publicKeys.map((key) => key.trim()).join('\n') + '\n',
      { encoding: 'utf8' },
    );

    try {
      await Command.runCommand('sudo', [
        'virt-customize',
        '-a',
        diskPath,
        '--run-command',
        `mkdir -p ${sshDir}`,
        '--upload',
        `${tmpPath}:${sshDir}/authorized_keys`,
        '--run-command',
        `chown -R ${guestUser}:${guestUser} ${sshDir}`,
        '--run-command',
        `chmod 700 ${sshDir}`,
        '--run-command',
        `chmod 600 ${sshDir}/authorized_keys`,
      ]);
    } finally {
      await fsPromises.rm(tmpPath, { force: true });
    }

    console.log(
      `Wrote ${publicKeys.length} SSH keys offline to ${vmName}:${sshDir}/authorized_keys`,
    );
  }

  public async forceStopWorker(vmName: string): Promise<void> {
    this.validateVmName(vmName);

    if (!(await this.isWorkerRunning(vmName))) {
      console.log(`VM ${vmName} is not running, nothing to force off`);
      return;
    }

    await Command.runCommand('sudo', ['virsh', 'destroy', `${vmName}`]);
  }

  public async startWorker(vmName: string): Promise<void> {
    this.validateVmName(vmName);

    // `virsh start` errors on an already-running domain, which would make every
    // retry of WORKER_START fail even when the VM is up.
    if (await this.isWorkerRunning(vmName)) {
      console.log(`VM ${vmName} is already running`);
      return;
    }

    await this.assertHostMemoryAvailable(vmName);

    await Command.runCommand('sudo', ['virsh', 'start', vmName]);
  }

  public async deleteWorker(vmName: string): Promise<void> {
    this.validateVmName(vmName);
    console.log(`Deleting worker VM: ${vmName}`);

    if (await this.isWorkerDefined(vmName)) {
      await Command.runCommand('sudo', [
        'virsh',
        'undefine',
        `${vmName}`,
        '--remove-all-storage',
      ]);
    } else {
      console.log(`VM ${vmName} is not defined, only clearing its files`);
    }

    await fsPromises.rm(path.join(CLOUD_INIT_DIR_BASE, vmName), {
      recursive: true,
      force: true,
    });

    await fsPromises.rm(path.join(IMAGE_DIR, `${vmName}.img`), { force: true });
  }

  public async editWorkerZone(
    vmName: string,
    bridgeName?: string | null,
    mac?: string | null,
  ): Promise<void> {
    this.validateVmName(vmName);
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

  public async editWorkerMemory(vmName: string, newMemoryMb: number): Promise<void> {
    this.validateVmName(vmName);
    await Command.runCommand('sudo', [
      'virsh',
      'setmem',
      vmName,
      String(newMemoryMb * 1024),
      '--config',
    ]);
  }

  public async editWorkerCpus(vmName: string, newVcpus: number): Promise<void> {
    this.validateVmName(vmName);
    await Command.runCommand('sudo', [
      'virsh',
      'setvcpus',
      vmName,
      String(newVcpus),
      '--config',
    ]);
  }

  public async editWorkerDiskSpace(
    vmName: string,
    newDiskSizeGb: number,
  ): Promise<void> {
    this.validateVmName(vmName);
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

  public async isBridgeInUse(bridgeName: string): Promise<boolean> {
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

  public async isWorkerRunning(vmName: string): Promise<boolean> {
    this.validateVmName(vmName);

    if (!(await this.isWorkerDefined(vmName))) {
      return false;
    }

    const status = await Command.runCommand('sudo', [
      'virsh',
      'domstate',
      vmName,
    ]);
    return status.trim() === 'running';
  }

  public async getWorkerVnet(
    vmName: string,
    bridgeName?: string | null,
  ): Promise<string | null> {
    this.validateVmName(vmName);
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

  public async getDefinedWorkers(): Promise<string[]> {
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

  public async getRunningWorkers(): Promise<string[]> {
    const response = await Command.runCommand('sudo', [
      'virsh',
      'list',
      '--name',
    ]);

    return response.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  public async reconcileWorkers(expectedVmNames: string[]): Promise<string[]> {
    const expected = new Set(expectedVmNames);
    const workers = await this.getDefinedWorkers();
    const removed: string[] = [];

    for (const worker of workers) {
      if (expected.has(worker)) continue;

      try {
        if (await this.isWorkerRunning(worker)) {
          await this.forceStopWorker(worker);
          await sleep(500);
        }

        await this.deleteWorker(worker);
        removed.push(worker);
      } catch (error) {
        console.error(`Failed to delete worker ${worker}:`, error);
      }
    }

    return removed;
  }

  public async forceResetHive(): Promise<string[]> {
    return this.reconcileWorkers([]);
  }

  public async testWorkerLogin(vmName: string): Promise<boolean> {
    this.validateVmName(vmName);
    try {
      console.log(`Testing login to worker VM: ${vmName}`);

      const result = await this.readVmConsole(vmName, 10_000, 'ubuntu\n');

      return result.includes('ubuntu@') || result.includes('#');
    } catch (error) {
      console.log(`Login test failed for ${vmName}: ${this.getErrorMessage(error)}`);
      return false;
    }
  }

  public async checkCloudInitStatus(vmName: string): Promise<{
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
      const consoleOutput = await this.readVmConsole(vmName, 15_000);

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
      console.log(`Could not check cloud-init status: ${this.getErrorMessage(error)}`);
    }

    return status;
  }

  public async diagnoseWorkerNetwork(
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
        console.log('Could not get VM interfaces:', this.getErrorMessage(e));
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
          const consoleTest = await this.readVmConsole(vmName, 5_000);
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
        console.log('Could not check dnsmasq logs:', this.getErrorMessage(e));
      }
    } catch (error) {
      console.error(
        `Error during worker network diagnostics: ${this.getErrorMessage(error)}`,
      );
    }

    return diagnostics;
  }

  private validateVmName(vmName: string): void {
    if (!SAFE_VM_NAME.test(vmName)) {
      throw new Error(`Invalid VM name: ${vmName}`);
    }
  }

  private async readVmConsole(
    vmName: string,
    timeoutMs: number,
    initialInput = '\n',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('sudo', ['virsh', 'console', vmName, '--force']);
      let output = '';
      let settled = false;

      const finish = (result: { output?: string; error?: Error }) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);

        if (result.error) {
          reject(result.error);
          return;
        }

        resolve((result.output ?? output).trim());
      };

      proc.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.on('error', (error) => {
        finish({ error });
      });

      proc.on('close', (code) => {
        if (code !== 0 && output.trim().length === 0) {
          finish({
            error: new Error(`virsh console exited with code ${code ?? 'unknown'}`),
          });
          return;
        }

        finish({ output });
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        finish({ output });
      }, timeoutMs);

      if (initialInput.length > 0) {
        proc.stdin.write(initialInput);
      }
      proc.stdin.end();
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private workerImagePath(workerImage: WorkerImageSource): string {
    return path.join(
      IMAGE_DIR,
      `${workerImage.osType}-${workerImage.osFamily}-${workerImage.osVersion}.img`.toLowerCase(),
    );
  }
}
