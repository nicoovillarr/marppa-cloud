import { Command } from '@/libs/Command';
import fs from 'fs';

const fsPromises = fs.promises;
import path from 'path';
import os from 'os';
import { IPHelper } from '@/libs/IPHelper';
import { MeshService } from '../../domain/services/MeshService';
import { Injectable } from '@/decorators/Injectable';
import { PortConflictError } from '../../domain/errors/PortConflictError';

@Injectable()
export class LinuxMeshService extends MeshService {
  // Zone bridges are persisted as systemd-networkd units (Ubuntu's default
  // renderer). ifupdown / `/etc/network/interfaces.d` is not installed on modern
  // Ubuntu, and `systemctl restart networking` would bounce the host uplink.
  private readonly networkDir: string = '/etc/systemd/network';
  private readonly dnsmasqDir: string = '/etc/dnsmasq.d';
  private readonly nftConfPath: string = '/etc/nftables.conf';
  private readonly nftConfBackupDir: string = '/etc/nft-backups';
  private readonly bridgeName: string;
  private readonly nftResetSourcePath: string;
  private static readonly RFC1918_RANGES = [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
  ];

  constructor() {
    super();
    this.bridgeName = process.env.BRIDGE_NAME ?? '';
    this.nftResetSourcePath = process.env.NFTABLES_RESET_SOURCE ?? '';
  }

  /** systemd-networkd unit paths for a zone bridge. */
  private netdevPath(bridgeName: string): string {
    return path.join(this.networkDir, `10-${bridgeName}.netdev`);
  }

  private networkPath(bridgeName: string): string {
    return path.join(this.networkDir, `10-${bridgeName}.network`);
  }

  /**
   * Write a file under /etc as root. The process runs unprivileged, so every
   * config file goes through a temp file + `sudo install`.
   */
  private async writeRootFile(
    destPath: string,
    content: string,
    mode = '644',
  ): Promise<void> {
    const tmpPath = path.join(
      os.tmpdir(),
      `mesh-${path.basename(destPath)}-${Date.now()}`,
    );

    await fsPromises.writeFile(tmpPath, content, { encoding: 'utf8' });

    try {
      await Command.runCommand('sudo', [
        'install',
        '-m',
        mode,
        tmpPath,
        destPath,
      ]);
    } finally {
      await fsPromises.rm(tmpPath, { force: true });
    }
  }

  private async readRootFile(filePath: string): Promise<string> {
    return Command.runCommand('sudo', ['cat', filePath]);
  }

  private async removeRootFile(filePath: string): Promise<void> {
    await Command.runCommand('sudo', ['rm', '-f', filePath]);
  }

  private async deviceExists(name: string): Promise<boolean> {
    try {
      await Command.runCommand('ip', ['link', 'show', name]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reload systemd-networkd so the persisted units are picked up. The bridge is
   * already live via `ip link` at this point, so a failure here only costs
   * persistence across reboots — never the current operation.
   */
  private async reloadNetworkd(): Promise<void> {
    try {
      await Command.runCommand('sudo', ['networkctl', 'reload']);
    } catch (err) {
      console.warn(
        `networkctl reload failed (zone stays up but may not survive a reboot): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  public async getIpList(cidr) {
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

  /**
   * Only the services this app owns are restarted. The host uplink is never
   * touched: restarting `networking` on a real server drops SSH, and the
   * nftables ruleset is applied live (and persisted) by the nft helpers.
   */
  public async restartServices() {
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
  }

  public async createZone(cidr, bridgeName, gatewayIp) {
    const ipList = await this.getIpList(cidr);
    const gateway = gatewayIp || ipList[1];

    // ZONE_CREATE is retried on failure; a partial attempt leaves units, a
    // dnsmasq drop-in or nft rules behind, and every retry would then die on
    // "already exists". Start from a clean slate for this zone only.
    await this.discardPartialZone(bridgeName, cidr);

    // Bridge first and already UP: dnsmasq binds to it (`bind-interfaces`) and
    // would fail to start if the device did not exist yet.
    await this.createInterface(bridgeName, cidr, gateway);

    try {
      await this.createDnsmasqConfig(bridgeName, gateway, ipList);
      await this.restartServices();
    } catch (err) {
      await this.destroyInterface(bridgeName);
      throw err;
    }

    try {
      await this.createNftablesConfig(bridgeName, cidr, gateway);
    } catch (err) {
      await this.removeRootFile(path.join(this.dnsmasqDir, `${bridgeName}.conf`));
      await this.destroyInterface(bridgeName);
      await this.restartServices();
      throw err;
    }
  }

  /**
   * Creates the zone bridge as a real device and persists it as a
   * systemd-networkd unit. Writing a config file alone never created the
   * interface — the device is brought up here explicitly and idempotently.
   */
  public async createInterface(bridgeName, cidr, gateway) {
    const netdevFile = this.netdevPath(bridgeName);
    if (fs.existsSync(netdevFile)) {
      throw new Error(`${netdevFile} already exists`);
    }

    const prefix = Number(String(cidr).split('/')[1]);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      throw new Error(`Invalid CIDR (missing or bad prefix): ${cidr}`);
    }

    console.log(`Creating bridge device: ${bridgeName} (${gateway}/${prefix})`);

    if (!(await this.deviceExists(bridgeName))) {
      await Command.runCommand('sudo', [
        'ip', 'link', 'add', 'name', bridgeName, 'type', 'bridge',
      ]);
    }

    const addrs = await Command.runCommand('ip', [
      '-o', 'addr', 'show', 'dev', bridgeName,
    ]);
    if (!addrs.includes(`${gateway}/${prefix}`)) {
      await Command.runCommand('sudo', [
        'ip', 'addr', 'add', `${gateway}/${prefix}`, 'dev', bridgeName,
      ]);
    }

    await Command.runCommand('sudo', ['ip', 'link', 'set', bridgeName, 'up']);

    // `ConfigureWithoutCarrier` is required: a bridge with no member port has no
    // carrier until the first VM vnet is attached, and networkd would otherwise
    // leave it unconfigured after a reboot.
    await this.writeRootFile(
      netdevFile,
      `[NetDev]
Name=${bridgeName}
Kind=bridge
`,
    );

    await this.writeRootFile(
      this.networkPath(bridgeName),
      `[Match]
Name=${bridgeName}

[Network]
Address=${gateway}/${prefix}
ConfigureWithoutCarrier=yes
LinkLocalAddressing=no
IPv6AcceptRA=no
`,
    );

    await this.reloadNetworkd();
  }

  /**
   * Wipes any leftover host config for this zone (and only this one — every
   * artifact is keyed by the zone id used as bridge name).
   */
  private async discardPartialZone(
    bridgeName: string,
    cidr: string,
  ): Promise<void> {
    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
    const hasLeftovers =
      fs.existsSync(this.netdevPath(bridgeName)) ||
      fs.existsSync(this.networkPath(bridgeName)) ||
      fs.existsSync(dnsmasqFile) ||
      (await this.deviceExists(bridgeName));

    if (!hasLeftovers) return;

    console.log(
      `Zone ${bridgeName} has leftovers from a previous attempt; cleaning up first`,
    );

    await this.removeRootFile(dnsmasqFile);
    await this.destroyInterface(bridgeName);

    try {
      await this.deleteNftablesConfig(bridgeName, cidr);
    } catch (err) {
      console.warn(
        `Could not clean leftover nftables rules for ${bridgeName}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** Tears the bridge device down and drops its persisted units. */
  private async destroyInterface(bridgeName: string): Promise<void> {
    await this.removeRootFile(this.netdevPath(bridgeName));
    await this.removeRootFile(this.networkPath(bridgeName));

    if (await this.deviceExists(bridgeName)) {
      try {
        await Command.runCommand('sudo', ['ip', 'link', 'delete', bridgeName]);
      } catch (err) {
        if (!String(err).includes('Cannot find device')) throw err;
      }
    }

    await this.reloadNetworkd();
  }

  public async ipcalcField(cidr, field) {
    const output = await Command.runCommand('ipcalc', [cidr]);
    const line = output
      .split('\n')
      .find((l) => l.trim().startsWith(`${field}:`));

    if (!line) return null;

    const match = line.match(/^[^:]+:\s+([^\s]+)/);
    return match ? match[1] : null;
  }

  public async createDnsmasqConfig(bridgeName, gateway, ipList) {
    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
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

    await this.writeRootFile(dnsmasqFile, dnsmasqConf);
  }

  public async createNftablesConfig(
    bridgeName,
    cidr,
    gateway,
    externalInterface = this.bridgeName,
  ) {
    if (!externalInterface)
      throw new Error('BRIDGE_NAME environment variable is required');
    console.log(`Configuring nftables for bridge: ${bridgeName}`);

    const inet = ['add', 'rule', 'inet', 'filter'];
    const commands: string[][] = [
      [...inet, 'input', 'iifname', `"${bridgeName}"`, 'ct', 'state', 'established,related', 'accept'],
      [...inet, 'input', 'iifname', `"${bridgeName}"`, 'udp', 'dport', '67', 'accept'],
      [...inet, 'input', 'iifname', `"${bridgeName}"`, 'ip', 'daddr', gateway, 'udp', 'dport', '53', 'accept'],
      [...inet, 'input', 'iifname', `"${bridgeName}"`, 'ip', 'daddr', gateway, 'tcp', 'dport', '53', 'accept'],
      [...inet, 'input', 'iifname', `"${bridgeName}"`, 'drop'],
      // Traffic from this zone towards other RFC1918 destinations (physical LAN,
      // other zones) must NOT be masqueraded: keep the VM source IP so the client
      // (with a static route to the host) accepts the reply (runbook §5.2).
      // These `return` rules precede the masquerade so only Internet-bound
      // traffic falls through to it.
      ...LinuxMeshService.RFC1918_RANGES.map((range) => [
        'add', 'rule', 'ip', 'nat', 'postrouting', 'oifname', `"${externalInterface}"`,
        'ip', 'saddr', cidr, 'ip', 'daddr', range, 'return',
      ]),
      ['add', 'rule', 'ip', 'nat', 'postrouting', 'oifname', `"${externalInterface}"`, 'ip', 'saddr', cidr, 'masquerade'],
      [...inet, 'forward', 'iifname', `"${bridgeName}"`, 'ct', 'state', 'established,related', 'accept'],
      ...LinuxMeshService.RFC1918_RANGES.map((range) => [
        ...inet, 'forward', 'iifname', `"${bridgeName}"`, 'ip', 'daddr', range, 'drop',
      ]),
      [...inet, 'forward', 'iifname', `"${bridgeName}"`, 'accept'],
      [...inet, 'forward', 'oifname', `"${bridgeName}"`, 'ct', 'state', 'established,related', 'accept'],
      [...inet, 'forward', 'oifname', `"${bridgeName}"`, 'iifname', `"${externalInterface}"`, 'accept'],
      [...inet, 'forward', 'oifname', `"${bridgeName}"`, 'drop'],
    ];

    console.log(`Adding nftables rules for bridge: ${bridgeName}`);

    await this.backupNftablesConfig();

    try {
      for (const args of commands) {
        await Command.runCommand('sudo', ['nft', ...args]);
      }

      await this.saveNftConfiguration();
    } catch (err) {
      console.error(
        'There was an error applying nftables:',
        err instanceof Error ? err.message : String(err),
      );
      console.log('Restoring last backup...');
      await Command.runCommand('sudo', [
        'cp',
        this.latestBackup(),
        this.nftConfPath,
      ]);
      await Command.runCommand('sudo', ['nft', '-f', this.nftConfPath]);
      throw err;
    }

    console.log(`nftables configured successfully for ${bridgeName}`);
  }

  public async backupNftablesConfig() {
    console.log('Creating backup of current nftables configuration...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(
      this.nftConfBackupDir,
      `nftables-${timestamp}.conf`,
    );

    await Command.runCommand('sudo', ['mkdir', '-p', this.nftConfBackupDir]);
    await Command.runCommand('sudo', ['cp', this.nftConfPath, backupFile]);

    console.log(`Backup created at ${backupFile}`);
  }

  public async saveNftConfiguration() {
    console.log('💾 Saving nftables configuration...');

    const tmpPath = path.join(os.tmpdir(), `nftables-${Date.now()}.conf`);
    const ruleset = await Command.runCommand('sudo', [
      'nft',
      'list',
      'ruleset',
    ]);

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

    await fsPromises.rm(tmpPath, { force: true });
    console.log('✅ nftables configuration validated and saved.');
  }

  public async deleteNftablesConfig(
    bridgeName,
    cidr,
    externalInterface = this.bridgeName,
  ) {
    if (!externalInterface)
      throw new Error('BRIDGE_NAME environment variable is required');
    const deleteMatchingRules = async (
      tableArgs: string[],
      chain: string,
      matchFn: (line: string) => boolean,
    ) => {
      const output = await Command.runCommand('sudo', [
        'nft',
        '-a',
        'list',
        'chain',
        ...tableArgs,
        chain,
      ]);
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/handle\s+(\d+)/);
        if (match && matchFn(trimmed)) {
          const handle = match[1];
          await Command.runCommand('sudo', [
            'nft',
            'delete',
            'rule',
            ...tableArgs,
            chain,
            'handle',
            handle,
          ]);
          console.log(
            `Deleted rule from ${tableArgs.join(' ')} ${chain} handle ${handle}`,
          );
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
          (line.includes('masquerade') || line.includes('return')),
      );

      await deleteMatchingRules(['inet', 'filter'], 'input', (line) =>
        line.includes(`iifname "${bridgeName}"`),
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

      await this.saveNftConfiguration();

      console.log(`Deleted nftables config for bridge ${bridgeName}`);
    } catch (err) {
      console.error(
        'Failed to delete nftables config:',
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  public async deleteZone(bridgeName, cidr) {
    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);

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

    let confText = await this.readRootFile(this.nftConfPath);
    const nftFilePath = `/etc/nftables.d/${bridgeName}.conf`;
    const includeLine = `include "${nftFilePath}"`;
    if (confText.includes(includeLine)) {
      confText = confText.replace(includeLine, '');
      await this.writeRootFile(this.nftConfPath, confText, '600');
    }

    await this.removeRootFile(dnsmasqFile);
    await this.removeRootFile(nftFilePath);

    await this.destroyInterface(bridgeName);

    await this.deleteNftablesConfig(bridgeName, cidr);

    await this.restartServices();
  }

  public async addNodeToZone(bridgeName, mac, ip) {
    if (!(await this.isIpInZoneRange(bridgeName, ip))) {
      throw new Error(`IP ${ip} is not in the DHCP range for ${bridgeName}`);
    }

    // Idempotent on retry: the same mac→ip reservation is a no-op, but the same
    // IP claimed by a different MAC is a real conflict.
    const dnsmasqPath = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
    if (await this.checkNodeInZone(bridgeName, ip)) {
      const conf = await fsPromises.readFile(dnsmasqPath, 'utf8');
      if (new RegExp(`^dhcp-host=${mac},${ip}$`, 'm').test(conf)) {
        console.log(`DHCP reservation ${mac} → ${ip} already present, skipping`);
        return;
      }

      throw new Error(`Node with IP ${ip} already exists in ${bridgeName}`);
    }

    console.log(
      `Adding DHCP reservation: ${mac} → ${ip} on bridge ${bridgeName}`,
    );

    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
    let content = await fsPromises.readFile(dnsmasqFile, 'utf8');
    content += `\ndhcp-host=${mac},${ip}\n`;
    await this.writeRootFile(dnsmasqFile, content);

    console.log(`Restarting dnsmasq to apply DHCP reservation for ${ip}`);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
    console.log(`✅ DHCP reservation added and activated: ${mac} → ${ip}`);
  }

  public async isIpInZoneRange(bridgeName, ip) {
    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
    if (!fs.existsSync(dnsmasqFile)) {
      throw new Error(
        `Bridge configuration file ${dnsmasqFile} does not exist`,
      );
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

  public async checkNodeInZone(bridgeName, ip) {
    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
    if (!fs.existsSync(dnsmasqFile)) {
      throw new Error(
        `Bridge configuration file ${dnsmasqFile} does not exist`,
      );
    }

    let content = await fsPromises.readFile(dnsmasqFile, 'utf8');

    const ipRegex = new RegExp(`^dhcp-host=[^,]+,${ip}$`, 'm');
    return ipRegex.test(content);
  }

  public async deleteNodeFromZone(bridgeName, mac) {
    const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
    let content = await fsPromises.readFile(dnsmasqFile, 'utf8');

    const lines = content.split('\n');
    const newLines = lines.filter(
      (line) => !line.startsWith(`dhcp-host=${mac},`),
    );

    if (lines.length === newLines.length) {
      console.log(`MAC ${mac} not found in ${dnsmasqFile}, nothing to remove`);
      return;
    }

    await this.writeRootFile(dnsmasqFile, newLines.join('\n'));
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);
  }

  public async linkVnetToBridge(vnetName, bridgeName) {
    try {
      console.log(`Attempting to link ${vnetName} to bridge ${bridgeName}...`);

      const vnetExists = await Command.runCommand('ip', [
        'link',
        'show',
        vnetName,
      ]);
      console.log(`VNet ${vnetName} exists:`, vnetExists.split('\n')[0]);

      const bridgeExists = await Command.runCommand('ip', [
        'link',
        'show',
        bridgeName,
      ]);
      console.log(`Bridge ${bridgeName} exists:`, bridgeExists.split('\n')[0]);

      const linkShow = await Command.runCommand('ip', [
        'link',
        'show',
        vnetName,
      ]);
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

        await Command.runCommand('sudo', [
          'ip',
          'link',
          'set',
          bridgeName,
          'up',
        ]);
        console.log(`✓ Set ${bridgeName} UP`);

        const verifyLink = await Command.runCommand('ip', [
          'link',
          'show',
          vnetName,
        ]);
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

      const finalStatus = await Command.runCommand('ip', [
        'link',
        'show',
        vnetName,
      ]);
      console.log(`Final ${vnetName} status:`, finalStatus.split('\n')[0]);
    } catch (e) {
      console.error(
        `❌ Error linking ${vnetName} to ${bridgeName}:`,
        e.message,
      );

      try {
        const vnetStatus = await Command.runCommand('ip', [
          'link',
          'show',
          vnetName,
        ]);
        console.log(`VNet status after error:`, vnetStatus.split('\n')[0]);
      } catch (debugError) {
        console.log(`Could not get vnet status: ${debugError.message}`);
      }

      throw e;
    }
  }

  public async unlinkVnetFromBridge(vnetName, bridgeName) {
    try {
      const linkShow = await Command.runCommand('ip', [
        'link',
        'show',
        vnetName,
      ]);
      if (linkShow.includes(`master ${bridgeName}`)) {
        await Command.runCommand('sudo', [
          'ip',
          'link',
          'set',
          vnetName,
          'nomaster',
        ]);
        console.log(`Detached ${vnetName} from bridge ${bridgeName}`);
      } else {
        console.log(`${vnetName} is not attached to ${bridgeName}`);
      }
    } catch (e) {
      console.error(`Error detaching ${vnetName} from ${bridgeName}:`, e);
      throw e;
    }
  }

  public async isZoneValid(bridgeName, cidr) {
    try {
      await fsPromises.access(this.netdevPath(bridgeName));
      await fsPromises.access(this.networkPath(bridgeName));

      const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
      await fsPromises.access(dnsmasqFile);

      const netmask = await this.ipcalcField(cidr, 'Netmask');
      if (!netmask) {
        throw new Error(`Invalid CIDR: ${cidr}`);
      }

      const linkShow = await Command.runCommand('ip', [
        'link',
        'show',
        bridgeName,
      ]);
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

      const nftList = await Command.runCommand('sudo', [
        'nft',
        'list',
        'ruleset',
      ]);
      const inputRule = new RegExp(`iifname\\s+"?${bridgeName}"?\\s+accept`);
      const forwardInRule = new RegExp(`iifname\\s+"?${bridgeName}"?.*accept`);
      const forwardOutRule = new RegExp(
        `oifname\\s+"?${bridgeName}"?\\s+accept`,
      );
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

  public async addFiber(
    bridgeName,
    protocol,
    externalPort,
    targetIp,
    internalPort,
    externalInterface = this.bridgeName,
  ) {
    if (!externalInterface)
      throw new Error('BRIDGE_NAME environment variable is required');
    // Always strings: these go straight into `nft` argv.
    const portToString = (p) =>
      Array.isArray(p) ? `${p[0]}-${p[1]}` : String(p);

    const extPortStr = portToString(externalPort);
    const intPortStr = portToString(internalPort);

    console.log(
      `Adding port forwarding ${protocol}/${extPortStr} → ${targetIp}:${intPortStr} via ${bridgeName}`,
    );

    const ruleset = await Command.runCommand('sudo', [
      'nft',
      'list',
      'ruleset',
    ]);
    const alreadyExists = new RegExp(
      `${protocol}\\s+dport\\s+${extPortStr}\\s+dnat\\s+to\\s+${targetIp}:${intPortStr}`,
    ).test(ruleset);
    if (alreadyExists) {
      console.log(`Port forwarding rule already exists, skipping.`);
      return;
    }

    const portTaken = new RegExp(
      `${protocol}\\s+dport\\s+${extPortStr}\\s+dnat\\s+to\\s+`,
    ).test(ruleset);
    if (portTaken) {
      throw new PortConflictError(
        `Port ${extPortStr}/${protocol} is already mapped to a different target`,
      );
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

  public async removeFiber(
    bridgeName,
    protocol,
    externalPort,
    targetIp,
    internalPort,
    externalInterface = this.bridgeName,
  ) {
    if (!externalInterface)
      throw new Error('BRIDGE_NAME environment variable is required');
    console.log(
      `Removing port forwarding for ${protocol}/${externalPort} → ${targetIp}:${internalPort} via ${bridgeName}`,
    );

    const deleteRuleByHandle = async (
      tableArgs: string[],
      chain: string,
      matchFn: (line: string) => boolean,
    ) => {
      const output = await Command.runCommand('sudo', [
        'nft',
        '-a',
        'list',
        'chain',
        ...tableArgs,
        chain,
      ]);
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        const handleMatch = trimmed.match(/handle\s+(\d+)/);
        if (handleMatch && matchFn(trimmed)) {
          await Command.runCommand('sudo', [
            'nft',
            'delete',
            'rule',
            ...tableArgs,
            chain,
            'handle',
            handleMatch[1],
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

  public async isPortAvailable(ipAddress, targetPort, protocol) {
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

  public async findNextPort(protocol) {
    const { MIN_PORT, MAX_PORT } = process.env;

    if (!MIN_PORT || !MAX_PORT) {
      throw new Error(
        'MIN_PORT and MAX_PORT environment variables are required',
      );
    }

    const portRegex = new RegExp(
      `${protocol}\\s+dport\\s+(?<port>[0-9]+)\\s+dnat\\s+to\\s+[0-9.]+:[0-9]+`,
    );

    const usedPorts = (
      await Command.runCommand('sudo', ['nft', 'list', 'ruleset'])
    )
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
    const candidates = Array.from(
      { length: max - min + 1 },
      (_, i) => min + i,
    ).filter((p) => !usedPorts[p]);

    if (candidates.length === 0) {
      throw new Error(
        `No available ${protocol} ports in range ${MIN_PORT}-${MAX_PORT}`,
      );
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  public async listActiveZones() {
    const files = await fsPromises.readdir(this.dnsmasqDir);
    const zones = files
      .filter((file) => file.startsWith('z-') && file.endsWith('.conf'))
      .map((file) => file.slice(0, -5));
    return zones;
  }

  public async forceResetMesh() {
    console.log('Forcing reset of mesh configuration...');

    const activeZones = [];

    console.log('Removing all dnsmasq configuration files...');
    const dnsmasqFiles = await fsPromises.readdir(this.dnsmasqDir);
    for (const file of dnsmasqFiles) {
      if (file.startsWith('z-') && file.endsWith('.conf')) {
        activeZones.push(file.slice(0, -5));

        const dnsmasqFile = path.join(this.dnsmasqDir, file);
        await this.removeRootFile(dnsmasqFile);
        console.log(`Removed ${dnsmasqFile}`);
      }
    }

    console.log('Removing all zone bridge units...');
    const networkFiles = await fsPromises.readdir(this.networkDir);
    for (const file of networkFiles) {
      const match = file.match(/^10-(z-[a-z0-9]+)\.(netdev|network)$/);
      if (match) {
        activeZones.push(match[1]);

        const unitFile = path.join(this.networkDir, file);
        await this.removeRootFile(unitFile);
        console.log(`Removed ${unitFile}`);
      }
    }

    if (!this.nftResetSourcePath) {
      throw new Error('NFTABLES_RESET_SOURCE environment variable is required for mesh reset');
    }
    await Command.runCommand('sudo', ['cp', this.nftResetSourcePath, this.nftConfPath]);
    // The base ruleset must also be applied live: nothing else reloads nftables
    // (restarting the service is avoided so live rules are never lost silently).
    await Command.runCommand('sudo', ['nft', '-f', this.nftConfPath]);

    for (const zone of new Set(activeZones)) {
      if (!(await this.deviceExists(zone))) continue;

      try {
        console.log(`Deleting zone ${zone}...`);
        await Command.runCommand('sudo', ['ip', 'link', 'delete', zone]);
      } catch (err) {
        console.error(`Failed to delete bridge ${zone}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await this.reloadNetworkd();

    console.log('Clearing dnsmasq leases and runtime files...');
    await Command.runCommand('sudo', ['systemctl', 'stop', 'dnsmasq']);
    await Command.runCommand('sudo', ['/usr/local/sbin/reset-dnsmasq.sh']);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'dnsmasq']);

    await this.restartServices();
  }

  public async verifyWorkerConnectivity(ip, timeout = 10) {
    try {
      console.log(`Verifying connectivity to worker at ${ip}...`);
      await Command.runCommand('ping', [
        '-c',
        '3',
        '-W',
        timeout.toString(),
        ip,
      ]);
      console.log(`✓ Worker at ${ip} is reachable`);
      return true;
    } catch (error) {
      console.log(`✗ Worker at ${ip} is not reachable: ${error.message}`);
      return false;
    }
  }

  public async diagnoseBridgeConnectivity(bridgeName, ip) {
    const diagnostics = {
      bridgeExists: false,
      bridgeUp: false,
      dhcpConfigExists: false,
      ipInDhcpRange: false,
      arpEntry: false,
      pingSuccessful: false,
    };

    try {
      const bridgeStatus = await Command.runCommand('ip', [
        'link',
        'show',
        bridgeName,
      ]);
      diagnostics.bridgeExists = true;
      diagnostics.bridgeUp = bridgeStatus.includes('state UP');

      const dnsmasqFile = path.join(this.dnsmasqDir, `${bridgeName}.conf`);
      diagnostics.dhcpConfigExists = fs.existsSync(dnsmasqFile);

      if (diagnostics.dhcpConfigExists) {
        diagnostics.ipInDhcpRange = await this.isIpInZoneRange(bridgeName, ip);
      }

      try {
        const arpOutput = await Command.runCommand('arp', ['-n']);
        diagnostics.arpEntry = arpOutput.includes(ip);
      } catch (e) {}

      diagnostics.pingSuccessful = await this.verifyWorkerConnectivity(ip, 5);
    } catch (error) {
      console.error(`Error during diagnostics: ${error.message}`);
    }

    return diagnostics;
  }

  public async forceRenewDhcpLease(bridgeName, mac = null) {
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
        } catch (e) {}
      }

      await Command.runCommand('sudo', ['systemctl', 'start', 'dnsmasq']);
      console.log(`✅ DHCP service restarted for ${bridgeName}`);

      return true;
    } catch (error) {
      console.error(`Error forcing DHCP lease renewal: ${error.message}`);
      return false;
    }
  }

  public async fixVnetBridgeConnection(vnetName, bridgeName) {
    try {
      console.log(
        `🔧 Attempting to fix vnet-bridge connection: ${vnetName} -> ${bridgeName}`,
      );

      await Command.runCommand('sudo', ['ip', 'link', 'set', bridgeName, 'up']);

      try {
        await Command.runCommand('sudo', [
          'ip',
          'link',
          'set',
          vnetName,
          'nomaster',
        ]);
        console.log(`Removed existing master from ${vnetName}`);
      } catch (e) {}

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

      const verifyLink = await Command.runCommand('ip', [
        'link',
        'show',
        vnetName,
      ]);
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

  public validateNftables(nftRuleset, zones, nodes, fibers) {
    const missing = { nat: [], fibers: [] };
    const details = [];

    const normalized = nftRuleset.replace(/\s+/g, ' ').toLowerCase();

    for (const zone of zones) {
      const regex = new RegExp(`ip saddr ${zone.cidr} masquerade`);
      if (!regex.test(normalized)) {
        missing.nat.push({ zoneId: zone.id, cidr: zone.cidr });
        details.push(
          `❌ Falta regla NAT para zona ${zone.name} (${zone.cidr})`,
        );
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

  private latestBackup(): string {
    const files = fs.readdirSync(this.nftConfBackupDir);
    const backups = files.filter((f) => f.startsWith('nftables-')).sort();

    if (!backups.length) {
      throw new Error(
        `No nftables backups found in ${this.nftConfBackupDir} — cannot restore`,
      );
    }

    return path.join(this.nftConfBackupDir, backups[backups.length - 1]);
  }
}
