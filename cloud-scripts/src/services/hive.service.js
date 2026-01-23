const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const runCommand = require('../libs/run-command');
const sleep = require('../libs/sleep');

const IMAGE_DIR = '/var/lib/libvirt/images';
const CLOUD_INIT_DIR_BASE = '/var/lib/libvirt/cloud-init';

/**
 * Get the file path for a worker image.
 * @param {WorkerImage} workerImage
 * @returns {string}
 */
function workerImagePath(workerImage) {
  return path.join(
    IMAGE_DIR,
    `${workerImage.osType}-${workerImage.osFamily}-${workerImage.osVersion}.img`.toLowerCase(),
  );
}

/**
 * Ensure the Ubuntu base image is downloaded.
 * @param {Object} workerImage - The worker image object containing osType, osFamily, osVersion, and imageUrl.
 * @returns {Promise<boolean>} - Returns true if the base image exists or was downloaded successfully
 */
async function ensureWorkerImageExists(workerImage) {
  try {
    const name = workerImagePath(workerImage);
    const url = workerImage.imageUrl;

    console.log(`Ensuring worker image exists at: ${name}`);

    if (!fs.existsSync(name)) {
      console.log(`Downloading worker image from: ${url}`);
    }

    await runCommand('wget', ['-O', name, '-c', url]);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create a new worker virtual machine.
 * @param {string} id - The ID of the worker VM.
 * @param {string} name - The name of the worker VM.
 * @param {string} mac - The MAC address for the worker VM.
 * @param {WorkerImage} workerImage - The worker image object containing the OS configuration.
 * @param {WorkerInstance} workerInstance - The worker instance object containing ramMb, cpus, and size.
 * @param {string[]} publicSshKeys - An array of SSH public keys to be added to the VM.
 * @throws {TypeError} If name, mac, workerImage, or workerInstance are not provided.
 * @throws {Error} If the base image does not exist at the expected path.
 */
async function createWorker(
  id,
  name,
  mac,
  workerImage,
  workerInstance,
  publicSshKeys,
) {
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

  const baseImgPath = workerImagePath(workerImage);
  if (!fs.existsSync(baseImgPath)) {
    throw new Error(`Base image not found at ${baseImgPath}`);
  }

  const imgPath = path.join(IMAGE_DIR, `${id}.img`);
  const cloudInitPath = path.join(CLOUD_INIT_DIR_BASE, id);
  await fsPromises.mkdir(cloudInitPath, { recursive: true });

  await runCommand('cp', [baseImgPath, imgPath]);

  await addSerialConsoleToGrub(imgPath);

  await addSerialTTYToSecuretty(imgPath);

  const isoPath = await createCloudInitISO(
    id,
    name,
    mac,
    cloudInitPath,
    publicSshKeys,
  );

  await defineVM(id, memory, cpus, size, imgPath, isoPath);
}

/**
 * Adds a serial console to the GRUB configuration of a VM image.
 * @param {string} imgPath
 */
async function addSerialConsoleToGrub(imgPath) {
  console.log(`Adding serial console to GRUB for image: ${imgPath}`);

  const tmpDir = await fsPromises.mkdtemp('/tmp/grub-edit-');
  await runCommand('sudo', [
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
  await runCommand('sudo', [
    'chown',
    `${process.env.USERNAME}:${process.env.USERNAME}`,
    grubPath,
  ]);

  let content = await fsPromises.readFile(grubPath, 'utf8');
  content = content.replace(
    /GRUB_CMDLINE_LINUX="([^"]*)"/,
    (_, g1) => `GRUB_CMDLINE_LINUX="${g1} console=ttyS0"`,
  );
  await fsPromises.writeFile(grubPath, content);

  console.log(`Inserting modified GRUB configuration into image: ${imgPath}`);

  await runCommand('sudo', [
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

/**
 * Adds a serial TTY to the securetty configuration of a VM image.
 * @param {string} imgPath
 */
async function addSerialTTYToSecuretty(imgPath) {
  console.log(`Adding serial TTY to securetty for image: ${imgPath}`);

  await runCommand('sudo', [
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

/**
 * Create a cloud-init ISO image.
 * @param {string} id - The ID of the VM.
 * @param {string} name - The name of the VM.
 * @param {string} mac - The MAC address of the VM.
 * @param {string} destDir - The destination directory for the ISO.
 * @returns {Promise<string>} - The path to the created ISO image.
 */
async function createCloudInitISO(id, name, mac, destDir, sshPublicKeys) {
  console.log(`Creating cloud-init ISO for VM: ${name}`);

  await fsPromises.mkdir(destDir, { recursive: true });

  // Build SSH keys with proper YAML formatting
  const sshKeysYaml =
    sshPublicKeys.length > 0
      ? `ssh_authorized_keys:\n${sshPublicKeys
          .map((k) => `      - ${k.trim()}`)
          .join('\n')}`
      : '';

  const userData = `#cloud-config
hostname: ${name}
ssh_pwauth: true
users:
  - name: ubuntu
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    shell: /bin/bash
    lock_passwd: false
    plain_text_passwd: ubuntu
    ${sshKeysYaml}

  - name: root
    lock_passwd: false
    plain_text_passwd: root

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
  enp6s0:
    dhcp4: true
`;

  await Promise.all([
    fsPromises.writeFile(`${destDir}/user-data`, userData),
    fsPromises.writeFile(`${destDir}/meta-data`, metaData),
    fsPromises.writeFile(`${destDir}/network-config`, networkConfig),
  ]);

  const isoPath = path.join(destDir, `seed-${id}.iso`);

  console.log(`Creating ISO at: ${isoPath}`);

  await runCommand('sudo', [
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

  await runCommand('sudo', ['chmod', '644', isoPath]);
  await runCommand('sudo', ['chown', 'libvirt-qemu:kvm', isoPath]);

  return isoPath;
}

/**
 * Define a virtual machine using virt-install.
 * @param {string} name - The name of the VM.
 * @param {number} memory - The amount of memory in MB.
 * @param {number} cpus - The number of virtual CPUs.
 * @param {number} size - The disk size in GB.
 * @param {string} imgPath - The path to the VM disk image.
 * @param {string} seedIsoPath - The path to the cloud-init ISO.
 * @returns {Promise<void>}
 */
async function defineVM(name, memory, cpus, size, imgPath, seedIsoPath) {
  console.log(
    `Defining VM: ${name} with memory: ${memory}MB, cpus: ${cpus}, size: ${size}GB`,
  );

  const xml = await runCommand('sudo', [
    'virt-install',
    '--name',
    name,
    '--memory',
    memory,
    '--vcpus',
    cpus,
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
  await runCommand('sudo', ['virsh', 'define', xmlPath]);
  await fsPromises.rm(xmlPath, { force: true });
}

/**
 * Stop a worker virtual machine.
 * @param {string} vmName
 */
async function stopWorker(vmName) {
  await runCommand('sudo', ['virsh', 'shutdown', `${vmName}`]);
}

/**
 * Force stop a worker virtual machine.
 * @param {string} vmName
 */
async function forceStopWorker(vmName) {
  await runCommand('sudo', ['virsh', 'destroy', `${vmName}`]);
}

/**
 * Start a worker virtual machine.
 * @param {string} vmName
 */
async function startWorker(vmName) {
  await runCommand('sudo', ['virsh', 'start', `${vmName}`]);
}

/**
 * Delete a worker virtual machine.
 * @param {string} vmName
 */
async function deleteWorker(vmName) {
  console.log(`Deleting worker VM: ${vmName}`);

  await runCommand('sudo', [
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

/**
 * Edit the network configuration of a worker virtual machine.
 * @param {string} vmName
 * @param {string} bridgeName
 * @param {string} mac
 */
async function editWorkerZone(vmName, bridgeName, mac) {
  console.log(
    `Editing worker zone for ${vmName}, bridge: ${bridgeName}, mac: ${mac}`,
  );

  const xmlRaw = await runCommand('sudo', ['virsh', 'dumpxml', vmName]);

  let newXml = xmlRaw.replace(/<interface[\s\S]*?<\/interface>/g, '');

  if (bridgeName && mac) {
    const interfaceXml = `
  <interface type='bridge'>
    <mac address='${mac}'/>
    <source bridge='${bridgeName}'/>
    <model type='virtio'/>
    <driver name='vhost' queues='2'/>
  </interface>`;

    newXml = newXml.replace(/<\/devices>/, `${interfaceXml}\n  </devices>`);
  } else {
    console.log(
      `No bridge or MAC provided, removing network interface from ${vmName}`,
    );

    // Not sure if this line does what I want.
    // TODO: test it properly.
    newXml = newXml.replace(/<\/devices>/, `\n  </devices>`);
  }

  const tmpPath = `/tmp/${vmName}-net.xml`;
  await fsPromises.writeFile(tmpPath, newXml);

  await runCommand('sudo', ['virsh', 'define', tmpPath]);
  await fsPromises.rm(tmpPath);

  console.log(`Network configuration updated for ${vmName}`);
}

/**
 * Edit the memory allocation of a worker virtual machine.
 * @param {string} vmName
 * @param {number} newMemoryMb
 */
async function editWorkerMemory(vmName, newMemoryMb) {
  await runCommand('sudo', [
    'virsh',
    'setmem',
    vmName,
    newMemoryMb * 1024,
    '--config',
  ]);
}

/**
 * Edit the CPU allocation of a worker virtual machine.
 * @param {string} vmName
 * @param {number} newVcpus
 */
async function editWorkerCpus(vmName, newVcpus) {
  await runCommand('sudo', ['virsh', 'setvcpus', vmName, newVcpus, '--config']);
}

/**
 * Edit the disk space allocation of a worker virtual machine.
 * @param {string} vmName
 * @param {number} newDiskSizeGb
 */
async function editWorkerDiskSpace(vmName, newDiskSizeGb) {
  const diskPath = path.join(IMAGE_DIR, `${vmName}.img`);
  await runCommand('qemu-img', ['resize', diskPath, `${newDiskSizeGb}G`]);
}

/**
 * Check if a bridge is in use by any virtual machine.
 * @param {string} bridgeName
 * @returns {Promise<boolean>}
 */
async function isBridgeInUse(bridgeName) {
  const vmListRaw = await runCommand('virsh', ['list', '--all', '--name']);
  const vmNames = vmListRaw.split('\n').filter(Boolean);

  for (const name of vmNames) {
    const dumpxml = await runCommand('virsh', ['dumpxml', name]);
    if (dumpxml.includes(`<source bridge='${bridgeName}'`)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a worker virtual machine is running.
 * @param {string} vmName
 * @returns {Promise<boolean>}
 */
async function isWorkerRunning(vmName) {
  const status = await runCommand('sudo', ['virsh', 'domstate', vmName]);
  return status.trim() === 'running';
}

/**
 * Get the virtual network interface of a worker virtual machine.
 * @param {string} vmName
 * @param {string} bridgeName
 * @returns {Promise<string|null>}
 */
async function getWorkerVnet(vmName, bridgeName) {
  const vnetInfo = await runCommand(
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

/**
 * Get a list of defined worker virtual machines.
 * @returns {Promise<string[]>} - Returns a list of defined worker VM names.
 */
async function getDefinedWorkers() {
  console.log('Fetching defined worker VMs...');

  const response = await runCommand('sudo', ['virsh', 'list', '--all']);
  const lines = response.split('\n').filter(Boolean);

  const vmNameRegex = /(w-\S+)/g;
  const vmNames = [];

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = vmNameRegex.exec(line);
    if (match && match[0]) {
      vmNames.push(match[0]);
    }
  }

  return vmNames;
}

/**
 * Force delete all worker virtual machines in the hive.
 */
async function forceResetHive() {
  const workers = await getDefinedWorkers();

  for (const worker of workers) {
    try {
      if (await isWorkerRunning(worker)) {
        await forceStopWorker(worker);
        await sleep(500);
      }

      await deleteWorker(worker);
    } catch (error) {
      console.error(`Failed to delete worker ${worker}:`, error);
    }
  }
}

/**
 * Test if we can login to a worker VM using the default credentials
 * @param {string} vmName - Name of the VM
 * @returns {Promise<boolean>} - Returns true if login is successful
 */
async function testWorkerLogin(vmName) {
  try {
    console.log(`Testing login to worker VM: ${vmName}`);

    // Try to execute a simple command via console
    const result = await runCommand('timeout', [
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

/**
 * Check cloud-init status in a worker VM
 * @param {string} vmName - Name of the VM
 * @returns {Promise<Object>} - Cloud-init status information
 */
async function checkCloudInitStatus(vmName) {
  const status = {
    cloudInitExists: false,
    cloudInitComplete: false,
    networkConfigured: false,
    sshConfigured: false,
  };

  try {
    // Check if we can see cloud-init logs via console (this is tricky but possible)
    const consoleOutput = await runCommand('timeout', [
      '15',
      'bash',
      '-c',
      `echo "" | sudo virsh console ${vmName} --force 2>&1 | head -20`,
    ]);

    status.cloudInitExists =
      consoleOutput.includes('cloud-init') || consoleOutput.includes('ubuntu');
    status.cloudInitComplete =
      consoleOutput.includes('login:') || consoleOutput.includes('ubuntu@');

    // Check if networking is up by looking for DHCP activity in dnsmasq logs
    const dhcpLogs = await runCommand('journalctl', [
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

/**
 * Diagnose worker VM network issues
 * @param {string} vmName - Name of the VM
 * @param {string} expectedIp - Expected IP address
 * @param {string} bridgeName - Bridge name
 * @returns {Promise<Object>} - Diagnostic information
 */
async function diagnoseWorkerNetwork(vmName, expectedIp, bridgeName) {
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
    // Check if VM is running
    diagnostics.vmRunning = await isWorkerRunning(vmName);

    // Get VM network interfaces
    try {
      const iflist = await runCommand('sudo', ['virsh', 'domiflist', vmName]);
      diagnostics.vmInterfaces = iflist.split('\n').filter(Boolean);
      diagnostics.vmHasInterface =
        iflist.includes('bridge') && iflist.includes(bridgeName);
    } catch (e) {
      console.log('Could not get VM interfaces:', e.message);
    }

    // Check if vnet exists and is connected
    if (diagnostics.vmRunning) {
      const vnet = await getWorkerVnet(vmName, bridgeName);
      diagnostics.vnetExists = !!vnet;

      if (vnet) {
        try {
          // Use ip command instead of bridge command for compatibility
          const vnetStatus = await runCommand('ip', ['link', 'show', vnet]);
          diagnostics.vnetConnectedToBridge = vnetStatus.includes(
            `master ${bridgeName}`,
          );
          console.log(`VNet ${vnet} status: ${vnetStatus.split('\n')[0]}`);
        } catch (e) {
          console.log('Could not check vnet bridge connection:', e.message);
        }
      }
    }

    // Check VM console accessibility (basic check)
    try {
      if (diagnostics.vmRunning) {
        // Check if we can access console and if cloud-init completed
        const consoleTest = await runCommand('timeout', [
          '5',
          'bash',
          '-c',
          `echo "" | sudo virsh console ${vmName} --force 2>&1 | head -10`,
        ]);
        diagnostics.vmConsoleAccessible = !consoleTest.includes('error');

        // Check if cloud-init is complete by looking for specific markers
        if (consoleTest.includes('login:') || consoleTest.includes('ubuntu@')) {
          diagnostics.cloudInitComplete = true;
        }
      }
    } catch (e) {
      // Expected to timeout/fail if VM is not responsive
      diagnostics.vmConsoleAccessible = false;
    }

    // Check for DHCP requests in dnsmasq logs
    try {
      const logs = await runCommand('journalctl', [
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
    console.error(`Error during worker network diagnostics: ${error.message}`);
  }

  return diagnostics;
}

module.exports = {
  ensureWorkerImageExists,
  createWorker,
  stopWorker,
  forceStopWorker,
  startWorker,
  deleteWorker,
  editWorkerZone,
  editWorkerMemory,
  editWorkerCpus,
  editWorkerDiskSpace,
  isBridgeInUse,
  isWorkerRunning,
  getWorkerVnet,
  forceResetHive,
  diagnoseWorkerNetwork,
  testWorkerLogin,
  checkCloudInitStatus,
};
