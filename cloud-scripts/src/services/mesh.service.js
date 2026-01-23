const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os');
const runCommand = require('../libs/run-command');
const ipHelper = require('../libs/ip-helper');

const INTERFACES_DIR = '/etc/network/interfaces.d';
const DNSMASQ_DIR = '/etc/dnsmasq.d';

const NFT_CONF_PATH = '/etc/nftables.conf';
const NFT_CONF_BACKUP_DIR = '/etc/nft-backups';

/**
 * Get a list of all IP addresses in a CIDR range.
 * @param {string} cidr
 * @returns {Promise<string[]>}
 * @throws {Error} If nmap command fails or returns no output.
 */
async function getIpList(cidr) {
  console.log(`Getting IP list for CIDR: ${cidr}`);

  const output = await runCommand('nmap', ['-sL', '-n', cidr]);

  if (!output) {
    throw new Error(`No output from nmap for CIDR ${cidr}`);
  }

  return output
    .split('\n')
    .filter((l) => l.startsWith('Nmap scan report'))
    .map((l) => l.substring('Nmap scan report for'.length).trim());
}

/**
 * Restart networking services to apply changes.
 */
async function restartServices() {
  await runCommand('sudo', ['systemctl', 'restart', 'networking']);
  await runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
  await runCommand('sudo', ['systemctl', 'restart', 'nftables']);
}

/**
 * Creates a subnet by configuring network interfaces, DHCP and firewall rules.
 * @param {string} cidr
 * @param {string} bridgeName
 * @param {string} gatewayIp
 */
async function createZone(cidr, bridgeName, gatewayIp) {
  const ipList = await getIpList(cidr);
  const gateway = gatewayIp || ipList[1];

  await createInterface(bridgeName, cidr, gateway);
  await createDnsmasqConfig(bridgeName, gateway, ipList);
  await createNftablesConfig(bridgeName, cidr);
  await restartServices();
}

/**
 * Creates a network interface configuration file.
 * @param {string} bridgeName
 * @param {string} cidr
 * @param {string} gateway
 */
async function createInterface(bridgeName, cidr, gateway) {
  const bridgeFile = path.join(INTERFACES_DIR, bridgeName);
  if (fs.existsSync(bridgeFile)) {
    throw new Error(`${bridgeFile} already exists`);
  }

  console.log(`Creating interface for bridge: ${bridgeName}`);

  const netmask = await ipcalcField(cidr, 'Netmask');

  const ifaceConf = `auto ${bridgeName}
iface ${bridgeName} inet static
address ${gateway}
netmask ${netmask}
bridge_ports none
`;

  await fsPromises.writeFile(bridgeFile, ifaceConf);
}

/**
 * Get a specific field from the output of ipcalc.
 * @param {string} cidr
 * @param {string} field
 * @returns {Promise<string|null>}
 */
async function ipcalcField(cidr, field) {
  const output = await runCommand('ipcalc', [cidr]);
  const line = output.split('\n').find((l) => l.trim().startsWith(`${field}:`));

  if (!line) return null;

  const match = line.match(/^[^:]+:\s+([^\s]+)/);
  return match ? match[1] : null;
}

/**
 * Creates a dnsmasq configuration file.
 * @param {string} bridgeName
 * @param {string} gateway
 * @param {string[]} ipList
 */
async function createDnsmasqConfig(bridgeName, gateway, ipList) {
  const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
  if (fs.existsSync(dnsmasqFile)) {
    throw new Error(`${dnsmasqFile} already exists`);
  }

  console.log(`Creating dnsmasq config for bridge: ${bridgeName}`);

  const dhcpStart = ipList[2];
  const dhcpEnd = ipList[ipList.length - 2];

  const dnsmasqConf = `interface=${bridgeName}
bind-interfaces
dhcp-option=3,${gateway}
dhcp-range=${dhcpStart},${dhcpEnd},12h
`;

  await fsPromises.writeFile(dnsmasqFile, dnsmasqConf);
}

/**
 * Creates a nftables configuration for a bridge.
 * @param {string} bridgeName
 * @param {string} cidr
 * @param {string} externalInterface
 */
async function createNftablesConfig(
  bridgeName,
  cidr,
  externalInterface = process.env.BRIDGE_NAME,
) {
  console.log(`Configuring nftables for bridge: ${bridgeName}`);

  const commands = [
    `add rule inet filter input iifname "${bridgeName}" accept`,
    `add rule ip nat postrouting oifname "${externalInterface}" ip saddr ${cidr} masquerade`,
    `add rule inet filter forward iifname "${bridgeName}" accept`,
    `add rule inet filter forward oifname "${bridgeName}" accept`,
  ];

  console.log(`Adding nftables rules for bridge: ${bridgeName}`);

  await backupNftablesConfig();

  try {
    for (const cmd of commands) {
      await runCommand('sudo', ['nft', ...cmd.split(' ')]);
    }

    await saveNftConfiguration();
  } catch (err) {
    console.error('There was an error applying nftables:', err.message);
    console.log('Restoring last backup...');
    await runCommand('sudo', ['cp', latestBackup(), NFT_CONF_PATH]);
    await runCommand('sudo', ['nft', '-f', NFT_CONF_PATH]);
  }

  console.log(`nftables configured successfully for ${bridgeName}`);
}

/**
 * Backs up the current nftables configuration file.
 */
async function backupNftablesConfig() {
  console.log('Creating backup of current nftables configuration...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(
    NFT_CONF_BACKUP_DIR,
    `nftables-${timestamp}.conf`,
  );

  await runCommand('sudo', ['cp', NFT_CONF_PATH, backupFile]);

  console.log(`Backup created at ${backupFile}`);
}

/**
 * Get the latest nftables backup file.
 * @returns {string} The path to the latest backup file.
 */
function latestBackup() {
  const files = fs.readdirSync(NFT_CONF_BACKUP_DIR);

  const backups = files.filter((f) => f.startsWith('nftables-'));
  backups.sort();

  return path.join(NFT_CONF_BACKUP_DIR, backups[backups.length - 1]);
}

/**
 * Saves the current nftables configuration to /etc/nftables.conf safely.
 * - Creates a temporary validated copy.
 * - Ensures correct permissions and atomic move.
 * - Validates syntax before replacing the existing config.
 */
async function saveNftConfiguration() {
  console.log('💾 Saving nftables configuration...');

  const tmpPath = path.join(os.tmpdir(), `nftables-${Date.now()}.conf`);
  const ruleset = await runCommand('sudo', ['nft', 'list', 'ruleset']);

  // 1️⃣ Write to a temp file
  await fsPromises.writeFile(tmpPath, ruleset, { encoding: 'utf8' });

  // 2️⃣ Validate syntax before replacing
  try {
    await runCommand('sudo', ['nft', '-c', '-f', tmpPath]); // -c = check syntax
  } catch (err) {
    console.error('❌ Invalid nftables configuration. Aborting save.');
    await fsPromises.rm(tmpPath, { force: true });
    throw new Error(err.stderr || err.message);
  }

  // 3️⃣ Move into place atomically
  await runCommand('sudo', [
    'install',
    '-m',
    '600',
    tmpPath,
    '/etc/nftables.conf',
  ]);

  // 4️⃣ Apply it immediately (optional but recommended)
  await runCommand('sudo', ['nft', '-f', '/etc/nftables.conf']);

  await fsPromises.rm(tmpPath, { force: true });
  console.log('✅ nftables configuration validated, applied, and saved.');
}

/**
 * Deletes nftables configuration for a bridge, including port forwardings.
 * @param {string} bridgeName
 * @param {string} cidr
 * @param {string} externalInterface
 */
async function deleteNftablesConfig(
  bridgeName,
  cidr,
  externalInterface = process.env.BRIDGE_NAME,
) {
  const deleteMatchingRules = async (table, chain, matchFn) => {
    const output = await runCommand('sudo', [
      'nft',
      '-a',
      'list',
      'chain',
      ...table.split(' '),
      chain,
    ]);
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/handle\s+(\d+)/);
      if (match && matchFn(trimmed)) {
        const handle = match[1];
        await runCommand('sudo', [
          'nft',
          'delete',
          'rule',
          ...table.split(' '),
          chain,
          'handle',
          handle,
        ]);
        console.log(`Deleted rule from ${table} ${chain} handle ${handle}`);
      }
    }
  };

  try {
    await deleteMatchingRules(
      'ip nat',
      'postrouting',
      (line) =>
        line.includes(`oifname "${externalInterface}"`) &&
        line.includes(`ip saddr ${cidr}`) &&
        line.includes('masquerade'),
    );

    await deleteMatchingRules(
      'inet filter',
      'input',
      (line) =>
        line.includes(`iifname "${bridgeName}"`) ||
        line.includes('icmp type echo-request') ||
        line.includes('udp sport 68 udp dport 67') ||
        line.includes('udp sport 67 udp dport 68'),
    );

    await deleteMatchingRules(
      'inet filter',
      'forward',
      (line) =>
        line.includes(`iifname "${bridgeName}"`) ||
        line.includes(`oifname "${bridgeName}"`) ||
        line.includes('ct state established,related') ||
        (line.includes(`ip daddr`) &&
          line.includes('dport') &&
          line.includes('accept')),
    );

    await deleteMatchingRules(
      'ip nat',
      'prerouting',
      (line) =>
        line.includes(`iifname "${bridgeName}"`) && line.includes('dnat to'),
    );

    console.log('Saving nftables configuration...');
    const finalRuleset = await runCommand('sudo', ['nft', 'list', 'ruleset']);
    await fsPromises.writeFile(`/tmp/nftables.conf`, finalRuleset, 'utf8');
    await runCommand('sudo', ['mv', '/tmp/nftables.conf', NFT_CONF_PATH]);
    await fsPromises.rm(`/tmp/nftables.conf`, { force: true });

    console.log(`Deleted nftables config for bridge ${bridgeName}`);
  } catch (err) {
    console.error('Failed to delete nftables config:', err.message);
  }
}

/**
 * Deletes a subnet.
 * @param {string} bridgeName
 * @param {string} cidr
 */
async function deleteZone(bridgeName, cidr) {
  const bridgeFile = path.join(INTERFACES_DIR, bridgeName);
  const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);

  try {
    const content = await fsPromises.readFile(dnsmasqFile, 'utf8');
    const hasMappedIps = content
      .split('\n')
      .some((line) => line.trim().startsWith('dhcp-host='));
    if (hasMappedIps) {
      throw new Error(`Cannot delete zone: ${dnsmasqFile} has mapped IPs`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  let confText = await fsPromises.readFile(NFT_CONF_PATH, 'utf8');
  const nftFilePath = `/etc/nftables.d/${bridgeName}.conf`;
  const includeLine = `include "${nftFilePath}"`;
  if (confText.includes(includeLine)) {
    confText = confText.replace(includeLine, '');
    await fsPromises.writeFile(NFT_CONF_PATH, confText);
  }

  await fsPromises.rm(bridgeFile, { force: true });
  await fsPromises.rm(dnsmasqFile, { force: true });
  await fsPromises.rm(nftFilePath, { force: true });

  await runCommand('sudo', ['ip', 'link', 'delete', bridgeName]);

  await deleteNftablesConfig(bridgeName, cidr);

  await restartServices();
}

/**
 * Adds a node (MAC, IP) to a bridge's DHCP configuration.
 * @param {string} bridgeName
 * @param {string} mac
 * @param {string} ip
 */
async function addNodeToZone(bridgeName, mac, ip) {
  if (!(await isIpInZoneRange(bridgeName, ip))) {
    throw new Error(`IP ${ip} is not in the DHCP range for ${bridgeName}`);
  }

  if (await checkNodeInZone(bridgeName, ip)) {
    throw new Error(`Node with IP ${ip} already exists in ${bridgeName}`);
  }

  console.log(
    `Adding DHCP reservation: ${mac} → ${ip} on bridge ${bridgeName}`,
  );

  const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
  let content = await fsPromises.readFile(dnsmasqFile, 'utf8');
  content += `\ndhcp-host=${mac},${ip}`;
  await fsPromises.writeFile(dnsmasqFile, content);

  // Restart only dnsmasq to apply the new reservation immediately
  console.log(`Restarting dnsmasq to apply DHCP reservation for ${ip}`);
  await runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);

  // Also clear any existing leases for this MAC/IP to ensure the reservation takes effect
  try {
    await runCommand('sudo', ['pkill', '-HUP', 'dnsmasq']);
    console.log(`Signaled dnsmasq to reload configuration`);
  } catch (e) {
    console.log(`Could not signal dnsmasq: ${e.message}`);
  }

  console.log(`✅ DHCP reservation added and activated: ${mac} → ${ip}`);
}

/**
 * Check if an IP is within a zone DHCP range.
 * @param {string} bridgeName
 * @param {string} ip
 * @returns {Promise<boolean>}
 * @throws {Error} If the bridge configuration file does not exist.
 */
async function isIpInZoneRange(bridgeName, ip) {
  const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
  if (!fs.existsSync(dnsmasqFile)) {
    throw new Error(`Bridge configuration file ${dnsmasqFile} does not exist`);
  }

  const content = await fsPromises.readFile(dnsmasqFile, 'utf8');
  const rangeMatch = content.match(/dhcp-range=([0-9.]+),([0-9.]+)/);
  if (!rangeMatch) {
    throw new Error(`Could not find dhcp-range in ${dnsmasqFile}`);
  }

  const [_, dhcpStart, dhcpEnd] = rangeMatch;
  return (
    ipHelper.ipToNum(ip) >= ipHelper.ipToNum(dhcpStart) &&
    ipHelper.ipToNum(ip) <= ipHelper.ipToNum(dhcpEnd)
  );
}

/**
 * Check if a node exists in a bridge's DHCP configuration.
 * @param {string} bridgeName
 * @param {string} ip
 * @returns {Promise<boolean>}
 * @throws {Error} If the bridge configuration file does not exist.
 */
async function checkNodeInZone(bridgeName, ip) {
  const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
  if (!fs.existsSync(dnsmasqFile)) {
    throw new Error(`Bridge configuration file ${dnsmasqFile} does not exist`);
  }

  let content = await fsPromises.readFile(dnsmasqFile, 'utf8');

  const ipRegex = new RegExp(`^dhcp-host=[^,]+,${ip}$`, 'm');
  return ipRegex.test(content);
}

/**
 * Deletes a node (MAC, IP) from a bridge's DHCP configuration.
 * @param {string} bridgeName
 * @param {string} mac
 */
async function deleteNodeFromZone(bridgeName, mac) {
  const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
  let content = await fsPromises.readFile(dnsmasqFile, 'utf8');

  const lines = content.split('\n');
  const newLines = lines.filter(
    (line) => !line.startsWith(`dhcp-host=${mac},`),
  );

  if (lines.length === newLines.length) {
    throw new Error(`Could not find MAC ${mac} in ${dnsmasqFile}`);
  }

  await fsPromises.writeFile(dnsmasqFile, newLines.join('\n'));
  await restartServices();
}

/**
 * Links a virtual network interface to a bridge.
 * @param {string} vnetName
 * @param {string} bridgeName
 */
async function linkVnetToBridge(vnetName, bridgeName) {
  try {
    console.log(`Attempting to link ${vnetName} to bridge ${bridgeName}...`);

    // First verify both vnet and bridge exist
    const vnetExists = await runCommand('ip', ['link', 'show', vnetName]);
    console.log(`VNet ${vnetName} exists:`, vnetExists.split('\n')[0]);

    const bridgeExists = await runCommand('ip', ['link', 'show', bridgeName]);
    console.log(`Bridge ${bridgeName} exists:`, bridgeExists.split('\n')[0]);

    // Check current status
    const linkShow = await runCommand('ip', ['link', 'show', vnetName]);
    const isAlreadyLinked = linkShow.includes(`master ${bridgeName}`);

    console.log(`${vnetName} current status:`, linkShow.split('\n')[0]);
    console.log(`Already linked to ${bridgeName}:`, isAlreadyLinked);

    if (!isAlreadyLinked) {
      console.log(`Linking ${vnetName} to ${bridgeName}...`);

      // Attach to bridge
      await runCommand('sudo', [
        'ip',
        'link',
        'set',
        vnetName,
        'master',
        bridgeName,
      ]);
      console.log(`✓ Attached ${vnetName} to bridge ${bridgeName}`);

      // Set interfaces up
      await runCommand('sudo', ['ip', 'link', 'set', vnetName, 'up']);
      console.log(`✓ Set ${vnetName} UP`);

      await runCommand('sudo', ['ip', 'link', 'set', bridgeName, 'up']);
      console.log(`✓ Set ${bridgeName} UP`);

      // Verify the link was successful
      const verifyLink = await runCommand('ip', ['link', 'show', vnetName]);
      if (verifyLink.includes(`master ${bridgeName}`)) {
        console.log(
          `✅ Successfully linked ${vnetName} to bridge ${bridgeName}`,
        );
      } else {
        throw new Error(
          `Link verification failed: ${vnetName} not attached to ${bridgeName}`,
        );
      }
    } else {
      console.log(`✓ ${vnetName} is already attached to ${bridgeName}`);
    }

    // Final status check
    const finalStatus = await runCommand('ip', ['link', 'show', vnetName]);
    console.log(`Final ${vnetName} status:`, finalStatus.split('\n')[0]);
  } catch (e) {
    console.error(`❌ Error linking ${vnetName} to ${bridgeName}:`, e.message);

    // Additional debugging info
    try {
      const vnetStatus = await runCommand('ip', ['link', 'show', vnetName]);
      console.log(`VNet status after error:`, vnetStatus.split('\n')[0]);
    } catch (debugError) {
      console.log(`Could not get vnet status: ${debugError.message}`);
    }

    throw e;
  }
}

/**
 * Unlinks a virtual network interface from a bridge.
 * @param {string} vnetName
 * @param {string} bridgeName
 */
async function unlinkVnetFromBridge(vnetName, bridgeName) {
  try {
    const linkShow = await runCommand('ip', ['link', 'show', vnetName]);
    if (linkShow.includes(`master ${bridgeName}`)) {
      await runCommand('sudo', ['ip', 'link', 'set', vnetName, 'nomaster']);
      console.log(`Detached ${vnetName} from bridge ${bridgeName}`);
    } else {
      console.log(`${vnetName} is not attached to ${bridgeName}`);
    }
  } catch (e) {
    console.error(`Error detaching ${vnetName} from ${bridgeName}:`, e);
    throw e;
  }
}

/**
 * Validates a zone by checking its configuration files, CIDR, and nftables rules.
 * @param {string} bridgeName
 * @param {string} cidr
 * @returns {Promise<boolean>}
 */
async function isZoneValid(bridgeName, cidr) {
  try {
    const bridgeFile = path.join(INTERFACES_DIR, bridgeName);
    await fsPromises.access(bridgeFile);

    const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
    await fsPromises.access(dnsmasqFile);

    const nftFilePath = `/etc/nftables.d/${bridgeName}.conf`;
    await fsPromises.access(nftFilePath);

    const netmask = await ipcalcField(cidr, 'Netmask');
    if (!netmask) {
      throw new Error(`Invalid CIDR: ${cidr}`);
    }

    const linkShow = await runCommand('ip', ['link', 'show', bridgeName]);
    if (!linkShow.includes('state UP')) {
      throw new Error(`Bridge ${bridgeName} is not UP`);
    }

    const dnsmasqContent = await fsPromises.readFile(dnsmasqFile, 'utf8');
    const dhcpRangeMatch = dnsmasqContent.match(
      /dhcp-range=([0-9.]+),([0-9.]+)/,
    );
    if (!dhcpRangeMatch) {
      throw new Error(`Invalid DHCP range in ${dnsmasqFile}`);
    }

    const [_, dhcpStart, dhcpEnd] = dhcpRangeMatch;
    const ipList = await getIpList(cidr);
    if (!ipList.includes(dhcpStart) || !ipList.includes(dhcpEnd)) {
      throw new Error(
        `DHCP range ${dhcpStart} - ${dhcpEnd} is not within CIDR ${cidr}`,
      );
    }

    const dhcpHosts = dnsmasqContent
      .split('\n')
      .filter((line) => line.startsWith('dhcp-host='))
      .map((line) => line.split(',')[1].trim());
    for (const host of dhcpHosts) {
      if (!ipList.includes(host)) {
        throw new Error(
          `DHCP host ${host} is not in the range ${dhcpStart} - ${dhcpEnd}`,
        );
      }
    }

    const nftList = await runCommand('sudo', ['nft', 'list', 'ruleset']);
    const inputRule = new RegExp(`iifname\\s+"?${bridgeName}"?\\s+accept`);
    const forwardInRule = new RegExp(`iifname\\s+"?${bridgeName}"?\\s+accept`);
    const forwardOutRule = new RegExp(`oifname\\s+"?${bridgeName}"?\\s+accept`);
    const natRule = new RegExp(`ip\\s+saddr\\s+${cidr}\\s+masquerade`);

    if (
      !inputRule.test(nftList) ||
      !forwardInRule.test(nftList) ||
      !forwardOutRule.test(nftList) ||
      !natRule.test(nftList)
    ) {
      throw new Error(`Missing nftables rules for bridge ${bridgeName}`);
    }

    return true;
  } catch (err) {
    console.error(`Zone validation failed for ${bridgeName}:`, err);
    return false;
  }
}

/**
 * Adds port forwarding rules to nftables for a given bridge.
 * Supports single ports or ranges.
 *
 * @param {string} bridgeName - Virtual bridge name (e.g., br0)
 * @param {'tcp'|'udp'} protocol - Protocol
 * @param {number|[number, number]} externalPort - Single port or [start, end]
 * @param {string} targetIp - Internal IP to forward to
 * @param {number|[number, number]} internalPort - Single port or [start, end]
 * @param {string} [externalInterface=process.env.BRIDGE_NAME] - External interface name where traffic arrives (e.g., enp5s0)
 */
async function addFiber(
  bridgeName,
  protocol,
  externalPort,
  targetIp,
  internalPort,
  externalInterface = process.env.BRIDGE_NAME,
) {
  // Helper to format ports for nftables
  const portToString = (p) => (Array.isArray(p) ? `${p[0]}-${p[1]}` : p);

  const extPortStr = portToString(externalPort);
  const intPortStr = portToString(internalPort);

  console.log(
    `Adding port forwarding ${protocol}/${extPortStr} → ${targetIp}:${intPortStr} via ${bridgeName}`,
  );

  // 1️⃣ DNAT en prerouting
  await runCommand('sudo', [
    'nft',
    'add',
    'rule',
    'ip',
    'nat',
    'prerouting',
    'iifname',
    externalInterface,
    protocol,
    'dport',
    extPortStr,
    'dnat',
    'to',
    `${targetIp}:${intPortStr}`,
  ]);

  // 2️⃣ Intentar insert rule, y si falla usar add rule
  await runCommand('sudo', [
    'nft',
    'add',
    'rule',
    'inet',
    'filter',
    'forward',
    'ct',
    'state',
    'new',
    'iifname',
    bridgeName,
    'ip',
    'daddr',
    targetIp,
    protocol,
    'dport',
    intPortStr,
    'accept',
  ]);

  await saveNftConfiguration();
  console.log('✅ Port forwarding rule added and saved.');
}

/**
 * Adds port forwarding rules to nftables for a given bridge.
 * Supports single ports or ranges.
 *
 * @param {string} bridgeName - Virtual bridge name (e.g., br0)
 * @param {'tcp'|'udp'} protocol - Protocol
 * @param {number} externalPort - External port where traffic arrives
 * @param {string} targetIp - Internal IP to forward to
 * @param {number} internalPort - Internal port to forward to
 * @param {string} [externalInterface=process.env.BRIDGE_NAME] - External interface name where internet comes from (e.g., enp5s0)
 */
async function removeFiber(
  bridgeName,
  protocol,
  externalPort,
  targetIp,
  internalPort,
  externalInterface = process.env.BRIDGE_NAME,
) {
  console.log(
    `Removing port forwarding for ${protocol}/${externalPort} → ${targetIp}:${internalPort} via ${bridgeName}`,
  );

  // 1️⃣ Delete DNAT rule in prerouting
  await runCommand('sudo', [
    'nft',
    'delete',
    'rule',
    'ip',
    'nat',
    'prerouting',
    'iifname',
    externalInterface,
    protocol,
    'dport',
    externalPort,
    'dnat',
    'to',
    `${targetIp}:${internalPort}`,
  ]);

  // 2️⃣ Delete forward rule
  await runCommand('sudo', [
    'nft',
    'delete',
    'rule',
    'inet',
    'filter',
    'forward',
    'ct',
    'state',
    'new',
    'iifname',
    bridgeName,
    'ip',
    'daddr',
    targetIp,
    protocol,
    'dport',
    internalPort,
  ]);

  await saveNftConfiguration();
  console.log('✅ Port forwarding rule removed and saved.');
}

/**
 * Checks if a target port is available for a specific IP address.
 * @param {string} ipAddress - Target IP address from the fiber's node.
 * @param {number} targetPort - Fiber's target port.
 * @param {'tcp'|'udp'} protocol - Protocol to check.
 * @returns {Promise<boolean>} - Returns true if the port is in use, false if available.
 */
async function isPortAvailable(ipAddress, targetPort, protocol) {
  console.log(
    `Checking if port ${targetPort} is available for ${ipAddress} over ${protocol}...`,
  );

  try {
    const ruleset = (
      await runCommand('sudo', ['nft', 'list', 'ruleset'])
    ).split('\n');

    const portRegex = new RegExp(
      `${protocol}\\s+dport\\s+([0-9]+)\\s+dnat\\s+to\\s+${ipAddress}:${targetPort}`,
    );

    return !ruleset.some((line) => portRegex.test(line));
  } catch (err) {
    console.error('Failed to check port availability:', err.message);
    return false;
  }
}

/** Finds the next available port for port forwarding.
 * @param {'tcp'|'udp'} protocol
 * @returns {Promise<number>} - An available port number.
 */
async function findNextPort(protocol) {
  const { MIN_PORT, MAX_PORT } = process.env;

  const portRegex = new RegExp(
    `${protocol}\\s+dport\\s+(?<port>[0-9]+)\\s+dnat\\s+to\\s+[0-9.]+:[0-9]+`,
  );

  const usedPorts = (await runCommand('sudo', ['nft', 'list', 'ruleset']))
    .split('\n')
    .reduce((acc, line) => {
      const match = line.match(portRegex);
      if (match) {
        const port = parseInt(match.groups.port, 10);
        acc[port] = true;
      }
      return acc;
    }, []);

  let hostPort = null;
  while (hostPort === null) {
    const randomPort =
      Math.floor(Math.random() * (Number(MAX_PORT) - Number(MIN_PORT) + 1)) +
      Number(MIN_PORT);
    if (!usedPorts[randomPort]) {
      hostPort = randomPort;
    }
  }

  return hostPort;
}

/**
 * Lists active zones for dnsmasq.
 * @returns {Promise<string[]>} - List of active zones (files starting with 'z-' in /etc/dnsmasq.d).
 */
async function listActiveZones() {
  const files = await fsPromises.readdir(DNSMASQ_DIR);
  const zones = files
    .filter((file) => file.startsWith('z-') && file.endsWith('.conf'))
    .map((file) => file.slice(0, -5));
  return zones;
}

/**
 * Forces a reset of the mesh configuration.
 */
async function forceResetMesh() {
  console.log('Forcing reset of mesh configuration...');

  const activeZones = [];

  console.log('Removing all dnsmasq configuration files...');
  const dnsmasqFiles = await fsPromises.readdir(DNSMASQ_DIR);
  for (const file of dnsmasqFiles) {
    if (file.startsWith('z-') && file.endsWith('.conf')) {
      activeZones.push(file.slice(0, -5));

      const dnsmasqFile = path.join(DNSMASQ_DIR, file);
      await fsPromises.rm(dnsmasqFile, { force: true });
      console.log(`Removed ${dnsmasqFile}`);
    }
  }

  console.log('Removing all network interface configuration files...');
  const interfaceFiles = await fsPromises.readdir(INTERFACES_DIR);
  for (const file of interfaceFiles) {
    if (file.startsWith('z-')) {
      activeZones.push(file);

      const interfaceFile = path.join(INTERFACES_DIR, file);
      await fsPromises.rm(interfaceFile, { force: true });
      console.log(`Removed ${interfaceFile}`);
    }
  }

  await runCommand('sudo', [
    'cp',
    `/home/${process.env.USERNAME}/nftables.conf`,
    '/etc/nftables.conf',
  ]);

  for (const zone of new Set(activeZones)) {
    try {
      console.log(`Deleting zone ${zone}...`);
      await runCommand('sudo', ['ip', 'link', 'delete', zone]);
    } catch (err) {}
  }

  console.log('Clearing dnsmasq leases and runtime files...');
  await runCommand('sudo', ['systemctl', 'stop', 'dnsmasq']);
  await runCommand('sudo', ['/usr/local/sbin/reset-dnsmasq.sh']);
  await runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);

  await restartServices();
}

/**
 * Verifies connectivity to a worker by checking if it responds to ping.
 * @param {string} ip - IP address to ping
 * @param {number} timeout - Timeout in seconds (default: 10)
 * @returns {Promise<boolean>} - Returns true if ping is successful
 */
async function verifyWorkerConnectivity(ip, timeout = 10) {
  try {
    console.log(`Verifying connectivity to worker at ${ip}...`);
    await runCommand('ping', ['-c', '3', '-W', timeout.toString(), ip]);
    console.log(`✓ Worker at ${ip} is reachable`);
    return true;
  } catch (error) {
    console.log(`✗ Worker at ${ip} is not reachable: ${error.message}`);
    return false;
  }
}

/**
 * Diagnose network issues for a specific bridge and IP.
 * @param {string} bridgeName - Name of the bridge
 * @param {string} ip - IP address to diagnose
 * @returns {Promise<Object>} - Diagnostic information
 */
async function diagnoseBridgeConnectivity(bridgeName, ip) {
  const diagnostics = {
    bridgeExists: false,
    bridgeUp: false,
    dhcpConfigExists: false,
    ipInDhcpRange: false,
    arpEntry: false,
    pingSuccessful: false,
  };

  try {
    // Check if bridge exists and is up
    const bridgeStatus = await runCommand('ip', ['link', 'show', bridgeName]);
    diagnostics.bridgeExists = true;
    diagnostics.bridgeUp = bridgeStatus.includes('state UP');

    // Check DHCP config
    const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
    diagnostics.dhcpConfigExists = fs.existsSync(dnsmasqFile);

    if (diagnostics.dhcpConfigExists) {
      diagnostics.ipInDhcpRange = await isIpInZoneRange(bridgeName, ip);
    }

    // Check ARP table
    try {
      const arpOutput = await runCommand('arp', ['-n']);
      diagnostics.arpEntry = arpOutput.includes(ip);
    } catch (e) {
      // ARP command might fail, that's ok
    }

    // Test connectivity
    diagnostics.pingSuccessful = await verifyWorkerConnectivity(ip, 5);
  } catch (error) {
    console.error(`Error during diagnostics: ${error.message}`);
  }

  return diagnostics;
}

/**
 * Forces a DHCP lease renewal by clearing existing leases and restarting dnsmasq
 * @param {string} bridgeName - Bridge name
 * @param {string} mac - MAC address (optional, to target specific device)
 * @returns {Promise<boolean>} - True if successful
 */
async function forceRenewDhcpLease(bridgeName, mac = null) {
  try {
    console.log(
      `🔄 Forcing DHCP lease renewal for bridge ${bridgeName}${
        mac ? ` (MAC: ${mac})` : ''
      }`,
    );

    // Stop dnsmasq
    await runCommand('sudo', ['systemctl', 'stop', 'dnsmasq']);

    // Clear lease files
    const leaseFiles = [
      '/var/lib/dnsmasq/dnsmasq.leases',
      '/var/lib/dhcp/dhcpd.leases',
      '/tmp/dnsmasq.leases',
    ];

    for (const leaseFile of leaseFiles) {
      try {
        await runCommand('sudo', ['rm', '-f', leaseFile]);
        console.log(`Cleared lease file: ${leaseFile}`);
      } catch (e) {
        // File might not exist, that's OK
      }
    }

    // Restart dnsmasq
    await runCommand('sudo', ['systemctl', 'start', 'dnsmasq']);
    console.log(`✅ DHCP service restarted for ${bridgeName}`);

    return true;
  } catch (error) {
    console.error(`Error forcing DHCP lease renewal: ${error.message}`);
    return false;
  }
}

/**
 * Attempts to fix a vnet bridge connection issue
 * @param {string} vnetName - Name of the vnet
 * @param {string} bridgeName - Name of the bridge
 * @returns {Promise<boolean>} - True if fixed successfully
 */
async function fixVnetBridgeConnection(vnetName, bridgeName) {
  try {
    console.log(
      `🔧 Attempting to fix vnet-bridge connection: ${vnetName} -> ${bridgeName}`,
    );

    // First, ensure the bridge is up
    await runCommand('sudo', ['ip', 'link', 'set', bridgeName, 'up']);

    // Remove any existing master (in case it's connected to wrong bridge)
    try {
      await runCommand('sudo', ['ip', 'link', 'set', vnetName, 'nomaster']);
      console.log(`Removed existing master from ${vnetName}`);
    } catch (e) {
      // This is fine if no master was set
      console.log(`No existing master to remove from ${vnetName}`);
    }

    // Set the vnet down, then up with the correct master
    await runCommand('sudo', ['ip', 'link', 'set', vnetName, 'down']);
    await runCommand('sudo', [
      'ip',
      'link',
      'set',
      vnetName,
      'master',
      bridgeName,
    ]);
    await runCommand('sudo', ['ip', 'link', 'set', vnetName, 'up']);

    // Verify the connection
    const verifyLink = await runCommand('ip', ['link', 'show', vnetName]);
    const isConnected = verifyLink.includes(`master ${bridgeName}`);

    if (isConnected) {
      console.log(`✅ Successfully fixed vnet-bridge connection`);
      return true;
    } else {
      console.log(`❌ Failed to establish vnet-bridge connection`);
      return false;
    }
  } catch (error) {
    console.error(`Error fixing vnet-bridge connection: ${error.message}`);
    return false;
  }
}

/**
 * Valida que nftables tenga todas las reglas necesarias
 * según las Zonas, Nodos y Redirecciones registradas en la BD.
 *
 * @param {string} nftRuleset - Texto del output de `nft list ruleset`
 * @param {Zone[]} zones
 * @param {Node[]} nodes
 * @param {Fiber[]} fibers
 * @returns {{
 *   valid: boolean,
 *   missing: {
 *     nat: Array<{ zoneId: string, cidr: string }>,
 *     fibers: Array<{ nodeId: string, hostPort: number, target: string }>
 *   },
 *   details: string[]
 * }}
 */
function validateNftables(nftRuleset, zones, nodes, fibers) {
  const missing = { nat: [], fibers: [] };
  const details = [];

  // Normalizamos el texto (sin mayúsculas, espacios redundantes)
  const normalized = nftRuleset.replace(/\s+/g, ' ').toLowerCase();

  // 1️⃣ Validar NAT (masquerade)
  for (const zone of zones) {
    const regex = new RegExp(`ip saddr ${zone.cidr} masquerade`);
    if (!regex.test(normalized)) {
      missing.nat.push({ zoneId: zone.id, cidr: zone.cidr });
      details.push(`❌ Falta regla NAT para zona ${zone.name} (${zone.cidr})`);
    } else {
      details.push(`✅ NAT presente para ${zone.name} (${zone.cidr})`);
    }
  }

  // 2️⃣ Validar DNAT (port forwarding)
  for (const pf of fibers) {
    const node = nodes.find((n) => n.id === pf.nodeId);
    if (!node) {
      details.push(`⚠️ Fiber ${pf.id} apunta a Node inexistente`);
      continue;
    }

    const rulePattern = new RegExp(
      `${pf.protocol}\\s+dport\\s+${pf.hostPort}\\s+dnat\\s+to\\s+${node.ipAddress}:${pf.targetPort}`,
      'i',
    );

    if (!rulePattern.test(normalized)) {
      missing.fibers.push({
        nodeId: node.id,
        hostPort: pf.hostPort,
        target: `${node.ipAddress}:${pf.targetPort}`,
      });
      details.push(
        `❌ Falta DNAT ${pf.protocol.toUpperCase()} ${pf.hostPort} → ${
          node.ipAddress
        }:${pf.targetPort}`,
      );
    } else {
      details.push(
        `✅ DNAT ${pf.protocol.toUpperCase()} ${pf.hostPort} → ${
          node.ipAddress
        }:${pf.targetPort}`,
      );
    }
  }

  const valid = missing.nat.length === 0 && missing.fibers.length === 0;
  return { valid, missing, details };
}

module.exports = {
  createZone,
  deleteZone,
  addNodeToZone,
  deleteNodeFromZone,
  linkVnetToBridge,
  unlinkVnetFromBridge,
  isZoneValid,
  isPortAvailable,
  addFiber,
  removeFiber,
  forceResetMesh,
  verifyWorkerConnectivity,
  diagnoseBridgeConnectivity,
  fixVnetBridgeConnection,
  forceRenewDhcpLease,
  validateNftables,
  findNextPort,
};
