import { Command } from '../../../libs/Command';
import fs from 'fs';
const fsPromises = fs.promises;
import path from 'path';
import os from 'os';
import { IPHelper } from '../../../libs/IPHelper';
import type { IMeshService } from './IMeshService';

const INTERFACES_DIR = '/etc/network/interfaces.d';
const DNSMASQ_DIR = '/etc/dnsmasq.d';

const NFT_CONF_PATH = '/etc/nftables.conf';
const NFT_CONF_BACKUP_DIR = '/etc/nft-backups';

export class MeshService implements IMeshService {
  async getIpList(cidr) {
    console.log(`Getting IP list for CIDR: ${cidr}`);
  
    const output = await Command.runCommand('nmap', ['-sL', '-n', cidr]);
  
    if (!output) {
      throw new Error(`No output from nmap for CIDR ${cidr}`);
    }
  
    return output
      .split('\n')
      .filter((l) => l.startsWith('Nmap scan report'))
      .map((l) => l.substring('Nmap scan report for'.length).trim());
  }
  
  async restartServices() {
    await Command.runCommand('sudo', ['systemctl', 'restart', 'networking']);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'nftables']);
  }
  
  async createZone(cidr, bridgeName, gatewayIp) {
    const ipList = await this.getIpList(cidr);
    const gateway = gatewayIp || ipList[1];

    await this.createInterface(bridgeName, cidr, gateway);

    try {
      await this.createDnsmasqConfig(bridgeName, gateway, ipList);
    } catch (err) {
      await fsPromises.rm(path.join(INTERFACES_DIR, bridgeName), { force: true });
      throw err;
    }

    try {
      await this.createNftablesConfig(bridgeName, cidr);
    } catch (err) {
      await fsPromises.rm(path.join(INTERFACES_DIR, bridgeName), { force: true });
      await fsPromises.rm(path.join(DNSMASQ_DIR, `${bridgeName}.conf`), { force: true });
      throw err;
    }

    await this.restartServices();
  }
  
  async createInterface(bridgeName, cidr, gateway) {
    const bridgeFile = path.join(INTERFACES_DIR, bridgeName);
    if (fs.existsSync(bridgeFile)) {
      throw new Error(`${bridgeFile} already exists`);
    }
  
    console.log(`Creating interface for bridge: ${bridgeName}`);
  
    const netmask = await this.ipcalcField(cidr, 'Netmask');
  
    const ifaceConf = `auto ${bridgeName}
iface ${bridgeName} inet static
  address ${gateway}
  netmask ${netmask}
  bridge_ports none
`;
  
    await fsPromises.writeFile(bridgeFile, ifaceConf);
  }
  
  async ipcalcField(cidr, field) {
    const output = await Command.runCommand('ipcalc', [cidr]);
    const line = output.split('\n').find((l) => l.trim().startsWith(`${field}:`));
  
    if (!line) return null;
  
    const match = line.match(/^[^:]+:\s+([^\s]+)/);
    return match ? match[1] : null;
  }
  
  async createDnsmasqConfig(bridgeName, gateway, ipList) {
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
  
  async createNftablesConfig(
    bridgeName,
    cidr,
    externalInterface = process.env.BRIDGE_NAME,
  ) {
    console.log(`Configuring nftables for bridge: ${bridgeName}`);
  
    const commands: string[][] = [
      ['add', 'rule', 'inet', 'filter', 'input', 'iifname', `"${bridgeName}"`, 'accept'],
      ['add', 'rule', 'ip', 'nat', 'postrouting', 'oifname', `"${externalInterface}"`, 'ip', 'saddr', cidr, 'masquerade'],
      ['add', 'rule', 'inet', 'filter', 'forward', 'iifname', `"${bridgeName}"`, 'accept'],
      ['add', 'rule', 'inet', 'filter', 'forward', 'oifname', `"${bridgeName}"`, 'accept'],
    ];

    console.log(`Adding nftables rules for bridge: ${bridgeName}`);

    await this.backupNftablesConfig();

    try {
      for (const args of commands) {
        await Command.runCommand('sudo', ['nft', ...args]);
      }
  
      await this.saveNftConfiguration();
    } catch (err) {
      console.error('There was an error applying nftables:', err.message);
      console.log('Restoring last backup...');
      await Command.runCommand('sudo', ['cp', this.latestBackup(), NFT_CONF_PATH]);
      await Command.runCommand('sudo', ['nft', '-f', NFT_CONF_PATH]);
      throw err;
    }

    console.log(`nftables configured successfully for ${bridgeName}`);
  }
  
  async backupNftablesConfig() {
    console.log('Creating backup of current nftables configuration...');
  
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(
      NFT_CONF_BACKUP_DIR,
      `nftables-${timestamp}.conf`,
    );
  
    await Command.runCommand('sudo', ['cp', NFT_CONF_PATH, backupFile]);
  
    console.log(`Backup created at ${backupFile}`);
  }
  
  latestBackup() {
    const files = fs.readdirSync(NFT_CONF_BACKUP_DIR);
  
    const backups = files.filter((f) => f.startsWith('nftables-'));
    backups.sort();
  
    return path.join(NFT_CONF_BACKUP_DIR, backups[backups.length - 1]);
  }
  
  async saveNftConfiguration() {
    console.log('💾 Saving nftables configuration...');
  
    const tmpPath = path.join(os.tmpdir(), `nftables-${Date.now()}.conf`);
    const ruleset = await Command.runCommand('sudo', ['nft', 'list', 'ruleset']);
  
    await fsPromises.writeFile(tmpPath, ruleset, { encoding: 'utf8' });
  
    try {
      await Command.runCommand('sudo', ['nft', '-c', '-f', tmpPath]);
    } catch (err) {
      console.error('❌ Invalid nftables configuration. Aborting save.');
      await fsPromises.rm(tmpPath, { force: true });
      throw new Error(err.stderr || err.message);
    }
  
    await Command.runCommand('sudo', [
      'install',
      '-m',
      '600',
      tmpPath,
      '/etc/nftables.conf',
    ]);
  
    await Command.runCommand('sudo', ['nft', '-f', '/etc/nftables.conf']);
  
    await fsPromises.rm(tmpPath, { force: true });
    console.log('✅ nftables configuration validated, applied, and saved.');
  }
  
  async deleteNftablesConfig(
    bridgeName,
    cidr,
    externalInterface = process.env.BRIDGE_NAME,
  ) {
    const deleteMatchingRules = async (tableArgs: string[], chain: string, matchFn: (line: string) => boolean) => {
      const output = await Command.runCommand('sudo', [
        'nft', '-a', 'list', 'chain', ...tableArgs, chain,
      ]);
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/handle\s+(\d+)/);
        if (match && matchFn(trimmed)) {
          const handle = match[1];
          await Command.runCommand('sudo', [
            'nft', 'delete', 'rule', ...tableArgs, chain, 'handle', handle,
          ]);
          console.log(`Deleted rule from ${tableArgs.join(' ')} ${chain} handle ${handle}`);
        }
      }
    };

    try {
      await deleteMatchingRules(
        ['ip', 'nat'],
        'postrouting',
        (line) =>
          line.includes(`oifname "${externalInterface}"`) &&
          line.includes(`ip saddr ${cidr}`) &&
          line.includes('masquerade'),
      );

      await deleteMatchingRules(
        ['inet', 'filter'],
        'input',
        (line) => line.includes(`iifname "${bridgeName}"`),
      );

      await deleteMatchingRules(
        ['inet', 'filter'],
        'forward',
        (line) =>
          line.includes(`iifname "${bridgeName}"`) ||
          line.includes(`oifname "${bridgeName}"`),
      );

      await deleteMatchingRules(
        ['ip', 'nat'],
        'prerouting',
        (line) =>
          line.includes(`iifname "${bridgeName}"`) && line.includes('dnat to'),
      );
  
      console.log('Saving nftables configuration...');
      const finalRuleset = await Command.runCommand('sudo', ['nft', 'list', 'ruleset']);
      await fsPromises.writeFile(`/tmp/nftables.conf`, finalRuleset, 'utf8');
      await Command.runCommand('sudo', ['mv', '/tmp/nftables.conf', NFT_CONF_PATH]);
  
      console.log(`Deleted nftables config for bridge ${bridgeName}`);
    } catch (err) {
      console.error('Failed to delete nftables config:', err.message);
    }
  }
  
  async deleteZone(bridgeName, cidr) {
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
  
    try {
      await Command.runCommand('sudo', ['ip', 'link', 'delete', bridgeName]);
    } catch (err) {
      if (!err.message?.includes('Cannot find device')) throw err;
    }

    await this.deleteNftablesConfig(bridgeName, cidr);
  
    await this.restartServices();
  }
  
  async addNodeToZone(bridgeName, mac, ip) {
    if (!(await this.isIpInZoneRange(bridgeName, ip))) {
      throw new Error(`IP ${ip} is not in the DHCP range for ${bridgeName}`);
    }
  
    if (await this.checkNodeInZone(bridgeName, ip)) {
      throw new Error(`Node with IP ${ip} already exists in ${bridgeName}`);
    }
  
    console.log(
      `Adding DHCP reservation: ${mac} → ${ip} on bridge ${bridgeName}`,
    );
  
    const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
    let content = await fsPromises.readFile(dnsmasqFile, 'utf8');
    content += `\ndhcp-host=${mac},${ip}`;
    await fsPromises.writeFile(dnsmasqFile, content);
  
    console.log(`Restarting dnsmasq to apply DHCP reservation for ${ip}`);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
    console.log(`✅ DHCP reservation added and activated: ${mac} → ${ip}`);
  }
  
  async isIpInZoneRange(bridgeName, ip) {
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
      IPHelper.ipToNum(ip) >= IPHelper.ipToNum(dhcpStart) &&
      IPHelper.ipToNum(ip) <= IPHelper.ipToNum(dhcpEnd)
    );
  }
  
  async checkNodeInZone(bridgeName, ip) {
    const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
    if (!fs.existsSync(dnsmasqFile)) {
      throw new Error(`Bridge configuration file ${dnsmasqFile} does not exist`);
    }
  
    let content = await fsPromises.readFile(dnsmasqFile, 'utf8');
  
    const ipRegex = new RegExp(`^dhcp-host=[^,]+,${ip}$`, 'm');
    return ipRegex.test(content);
  }
  
  async deleteNodeFromZone(bridgeName, mac) {
    const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
    let content = await fsPromises.readFile(dnsmasqFile, 'utf8');
  
    const lines = content.split('\n');
    const newLines = lines.filter(
      (line) => !line.startsWith(`dhcp-host=${mac},`),
    );
  
    if (lines.length === newLines.length) {
      console.log(`MAC ${mac} not found in ${dnsmasqFile}, nothing to remove`);
      return;
    }
  
    await fsPromises.writeFile(dnsmasqFile, newLines.join('\n'));
    await this.restartServices();
  }
  
  async linkVnetToBridge(vnetName, bridgeName) {
    try {
      console.log(`Attempting to link ${vnetName} to bridge ${bridgeName}...`);
  
      const vnetExists = await Command.runCommand('ip', ['link', 'show', vnetName]);
      console.log(`VNet ${vnetName} exists:`, vnetExists.split('\n')[0]);
  
      const bridgeExists = await Command.runCommand('ip', ['link', 'show', bridgeName]);
      console.log(`Bridge ${bridgeName} exists:`, bridgeExists.split('\n')[0]);
  
      const linkShow = await Command.runCommand('ip', ['link', 'show', vnetName]);
      const isAlreadyLinked = linkShow.includes(`master ${bridgeName}`);
  
      console.log(`${vnetName} current status:`, linkShow.split('\n')[0]);
      console.log(`Already linked to ${bridgeName}:`, isAlreadyLinked);
  
      if (!isAlreadyLinked) {
        console.log(`Linking ${vnetName} to ${bridgeName}...`);
  
        await Command.runCommand('sudo', [
          'ip',
          'link',
          'set',
          vnetName,
          'master',
          bridgeName,
        ]);
        console.log(`✓ Attached ${vnetName} to bridge ${bridgeName}`);
  
        await Command.runCommand('sudo', ['ip', 'link', 'set', vnetName, 'up']);
        console.log(`✓ Set ${vnetName} UP`);
  
        await Command.runCommand('sudo', ['ip', 'link', 'set', bridgeName, 'up']);
        console.log(`✓ Set ${bridgeName} UP`);
  
        const verifyLink = await Command.runCommand('ip', ['link', 'show', vnetName]);
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
  
      const finalStatus = await Command.runCommand('ip', ['link', 'show', vnetName]);
      console.log(`Final ${vnetName} status:`, finalStatus.split('\n')[0]);
    } catch (e) {
      console.error(`❌ Error linking ${vnetName} to ${bridgeName}:`, e.message);
  
      try {
        const vnetStatus = await Command.runCommand('ip', ['link', 'show', vnetName]);
        console.log(`VNet status after error:`, vnetStatus.split('\n')[0]);
      } catch (debugError) {
        console.log(`Could not get vnet status: ${debugError.message}`);
      }
  
      throw e;
    }
  }
  
  async unlinkVnetFromBridge(vnetName, bridgeName) {
    try {
      const linkShow = await Command.runCommand('ip', ['link', 'show', vnetName]);
      if (linkShow.includes(`master ${bridgeName}`)) {
        await Command.runCommand('sudo', ['ip', 'link', 'set', vnetName, 'nomaster']);
        console.log(`Detached ${vnetName} from bridge ${bridgeName}`);
      } else {
        console.log(`${vnetName} is not attached to ${bridgeName}`);
      }
    } catch (e) {
      console.error(`Error detaching ${vnetName} from ${bridgeName}:`, e);
      throw e;
    }
  }
  
  async isZoneValid(bridgeName, cidr) {
    try {
      const bridgeFile = path.join(INTERFACES_DIR, bridgeName);
      await fsPromises.access(bridgeFile);
  
      const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
      await fsPromises.access(dnsmasqFile);
  
      const nftFilePath = `/etc/nftables.d/${bridgeName}.conf`;
      await fsPromises.access(nftFilePath);
  
      const netmask = await this.ipcalcField(cidr, 'Netmask');
      if (!netmask) {
        throw new Error(`Invalid CIDR: ${cidr}`);
      }
  
      const linkShow = await Command.runCommand('ip', ['link', 'show', bridgeName]);
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
      const ipList = await this.getIpList(cidr);
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
  
      const nftList = await Command.runCommand('sudo', ['nft', 'list', 'ruleset']);
      const inputRule = new RegExp(`iifname\\s+"?${bridgeName}"?\\s+accept`);
      const forwardInRule = new RegExp(`iifname\\s+"?${bridgeName}"?.*accept`);
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
  
  async addFiber(
    bridgeName,
    protocol,
    externalPort,
    targetIp,
    internalPort,
    externalInterface = process.env.BRIDGE_NAME,
  ) {
    const portToString = (p) => (Array.isArray(p) ? `${p[0]}-${p[1]}` : p);
  
    const extPortStr = portToString(externalPort);
    const intPortStr = portToString(internalPort);
  
    console.log(
      `Adding port forwarding ${protocol}/${extPortStr} → ${targetIp}:${intPortStr} via ${bridgeName}`,
    );

    const ruleset = await Command.runCommand('sudo', ['nft', 'list', 'ruleset']);
    const alreadyExists = new RegExp(
      `${protocol}\\s+dport\\s+${extPortStr}\\s+dnat\\s+to\\s+${targetIp}:${intPortStr}`,
    ).test(ruleset);
    if (alreadyExists) {
      console.log(`Port forwarding rule already exists, skipping.`);
      return;
    }

    await Command.runCommand('sudo', [
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
  
    await Command.runCommand('sudo', [
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
      externalInterface,
      'ip',
      'daddr',
      targetIp,
      protocol,
      'dport',
      intPortStr,
      'accept',
    ]);
  
    await this.saveNftConfiguration();
    console.log('✅ Port forwarding rule added and saved.');
  }
  
  async removeFiber(
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
  
    const deleteRuleByHandle = async (tableArgs: string[], chain: string, matchFn: (line: string) => boolean) => {
      const output = await Command.runCommand('sudo', [
        'nft', '-a', 'list', 'chain', ...tableArgs, chain,
      ]);
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        const handleMatch = trimmed.match(/handle\s+(\d+)/);
        if (handleMatch && matchFn(trimmed)) {
          await Command.runCommand('sudo', [
            'nft', 'delete', 'rule', ...tableArgs, chain, 'handle', handleMatch[1],
          ]);
        }
      }
    };

    await deleteRuleByHandle(
      ['ip', 'nat'],
      'prerouting',
      (line) =>
        line.includes(`iifname "${externalInterface}"`) &&
        line.includes(`${protocol} dport ${externalPort}`) &&
        line.includes(`dnat to ${targetIp}:${internalPort}`),
    );

    await deleteRuleByHandle(
      ['inet', 'filter'],
      'forward',
      (line) =>
        line.includes(`iifname "${externalInterface}"`) &&
        line.includes(`ip daddr ${targetIp}`) &&
        line.includes(`${protocol} dport ${internalPort}`),
    );

    await this.saveNftConfiguration();
    console.log('✅ Port forwarding rule removed and saved.');
  }
  
  async isPortAvailable(ipAddress, targetPort, protocol) {
    console.log(
      `Checking if port ${targetPort} is available for ${ipAddress} over ${protocol}...`,
    );
  
    try {
      const ruleset = (
        await Command.runCommand('sudo', ['nft', 'list', 'ruleset'])
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
  
  async findNextPort(protocol) {
    const { MIN_PORT, MAX_PORT } = process.env;
  
    const portRegex = new RegExp(
      `${protocol}\\s+dport\\s+(?<port>[0-9]+)\\s+dnat\\s+to\\s+[0-9.]+:[0-9]+`,
    );
  
    const usedPorts = (await Command.runCommand('sudo', ['nft', 'list', 'ruleset']))
      .split('\n')
      .reduce((acc, line) => {
        const match = line.match(portRegex);
        if (match) {
          const port = parseInt(match.groups.port, 10);
          acc[port] = true;
        }
        return acc;
      }, []);
  
    const min = Number(MIN_PORT);
    const max = Number(MAX_PORT);
    const candidates = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter(
      (p) => !usedPorts[p],
    );

    if (candidates.length === 0) {
      throw new Error(`No available ${protocol} ports in range ${MIN_PORT}-${MAX_PORT}`);
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  
  async listActiveZones() {
    const files = await fsPromises.readdir(DNSMASQ_DIR);
    const zones = files
      .filter((file) => file.startsWith('z-') && file.endsWith('.conf'))
      .map((file) => file.slice(0, -5));
    return zones;
  }
  
  async forceResetMesh() {
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
  
    await Command.runCommand('sudo', [
      'cp',
      `/home/${process.env.USERNAME}/nftables.conf`,
      '/etc/nftables.conf',
    ]);
  
    for (const zone of new Set(activeZones)) {
      try {
        console.log(`Deleting zone ${zone}...`);
        await Command.runCommand('sudo', ['ip', 'link', 'delete', zone]);
      } catch (err) {}
    }
  
    console.log('Clearing dnsmasq leases and runtime files...');
    await Command.runCommand('sudo', ['systemctl', 'stop', 'dnsmasq']);
    await Command.runCommand('sudo', ['/usr/local/sbin/reset-dnsmasq.sh']);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
  
    await this.restartServices();
  }
  
  async verifyWorkerConnectivity(ip, timeout = 10) {
    try {
      console.log(`Verifying connectivity to worker at ${ip}...`);
      await Command.runCommand('ping', ['-c', '3', '-W', timeout.toString(), ip]);
      console.log(`✓ Worker at ${ip} is reachable`);
      return true;
    } catch (error) {
      console.log(`✗ Worker at ${ip} is not reachable: ${error.message}`);
      return false;
    }
  }
  
  async diagnoseBridgeConnectivity(bridgeName, ip) {
    const diagnostics = {
      bridgeExists: false,
      bridgeUp: false,
      dhcpConfigExists: false,
      ipInDhcpRange: false,
      arpEntry: false,
      pingSuccessful: false,
    };
  
    try {
      const bridgeStatus = await Command.runCommand('ip', ['link', 'show', bridgeName]);
      diagnostics.bridgeExists = true;
      diagnostics.bridgeUp = bridgeStatus.includes('state UP');
  
      const dnsmasqFile = path.join(DNSMASQ_DIR, `${bridgeName}.conf`);
      diagnostics.dhcpConfigExists = fs.existsSync(dnsmasqFile);
  
      if (diagnostics.dhcpConfigExists) {
        diagnostics.ipInDhcpRange = await this.isIpInZoneRange(bridgeName, ip);
      }
  
      try {
        const arpOutput = await Command.runCommand('arp', ['-n']);
        diagnostics.arpEntry = arpOutput.includes(ip);
      } catch (e) {
      }
  
      diagnostics.pingSuccessful = await this.verifyWorkerConnectivity(ip, 5);
    } catch (error) {
      console.error(`Error during diagnostics: ${error.message}`);
    }
  
    return diagnostics;
  }
  
  async forceRenewDhcpLease(bridgeName, mac = null) {
    try {
      console.log(
        `🔄 Forcing DHCP lease renewal for bridge ${bridgeName}${
          mac ? ` (MAC: ${mac})` : ''
        }`,
      );
  
      await Command.runCommand('sudo', ['systemctl', 'stop', 'dnsmasq']);
  
      const leaseFiles = [
        '/var/lib/dnsmasq/dnsmasq.leases',
        '/var/lib/dhcp/dhcpd.leases',
        '/tmp/dnsmasq.leases',
      ];
  
      for (const leaseFile of leaseFiles) {
        try {
          await Command.runCommand('sudo', ['rm', '-f', leaseFile]);
          console.log(`Cleared lease file: ${leaseFile}`);
        } catch (e) {
        }
      }
  
      await Command.runCommand('sudo', ['systemctl', 'start', 'dnsmasq']);
      console.log(`✅ DHCP service restarted for ${bridgeName}`);
  
      return true;
    } catch (error) {
      console.error(`Error forcing DHCP lease renewal: ${error.message}`);
      return false;
    }
  }
  
  async fixVnetBridgeConnection(vnetName, bridgeName) {
    try {
      console.log(
        `🔧 Attempting to fix vnet-bridge connection: ${vnetName} -> ${bridgeName}`,
      );
  
      await Command.runCommand('sudo', ['ip', 'link', 'set', bridgeName, 'up']);
  
      try {
        await Command.runCommand('sudo', ['ip', 'link', 'set', vnetName, 'nomaster']);
        console.log(`Removed existing master from ${vnetName}`);
      } catch (e) {
      }
  
      await Command.runCommand('sudo', ['ip', 'link', 'set', vnetName, 'down']);
      await Command.runCommand('sudo', [
        'ip',
        'link',
        'set',
        vnetName,
        'master',
        bridgeName,
      ]);
      await Command.runCommand('sudo', ['ip', 'link', 'set', vnetName, 'up']);
  
      const verifyLink = await Command.runCommand('ip', ['link', 'show', vnetName]);
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
  
  validateNftables(nftRuleset, zones, nodes, fibers) {
    const missing = { nat: [], fibers: [] };
    const details = [];
  
    const normalized = nftRuleset.replace(/\s+/g, ' ').toLowerCase();
  
    for (const zone of zones) {
      const regex = new RegExp(`ip saddr ${zone.cidr} masquerade`);
      if (!regex.test(normalized)) {
        missing.nat.push({ zoneId: zone.id, cidr: zone.cidr });
        details.push(`❌ Falta regla NAT para zona ${zone.name} (${zone.cidr})`);
      } else {
        details.push(`✅ NAT presente para ${zone.name} (${zone.cidr})`);
      }
    }
  
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
}
