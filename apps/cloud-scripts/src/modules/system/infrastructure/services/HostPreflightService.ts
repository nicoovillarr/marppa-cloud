import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from '@/libs/Command';
import { NftablesRuleset } from '@/libs/NftablesRuleset';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';

const REQUIRED_BINARIES = [
  'nmap', 'ipcalc', 'nft', 'dnsmasq', 'virsh', 'virt-install',
  'virt-customize', 'genisoimage', 'guestfish', 'qemu-img', 'wget', 'ping',
  'arp', 'ip', 'networkctl', 'caddy',
];

const REQUIRED_ENV_VARS = [
  // Host / infrastructure
  'BRIDGE_NAME', 'USERNAME', 'MIN_PORT', 'MAX_PORT',
  'NFTABLES_RESET_SOURCE', 'ALLOWED_IMAGE_DOMAINS',
  // Services this app cannot run without
  'DATABASE_URL', 'REDIS_URL', 'WS_PORT', 'JWT_SECRET',
];

/** Env vars that must parse as a positive integer. */
const NUMERIC_ENV_VARS = ['MIN_PORT', 'MAX_PORT', 'WS_PORT'];

/** Directories the app writes zone/VM state into. */
const REQUIRED_DIRS = [
  '/etc/dnsmasq.d',
  '/etc/systemd/network',
  '/etc/nft-backups',
  '/var/lib/libvirt/images',
  '/var/lib/libvirt/cloud-init',
];

const DNSMASQ_RESET_SCRIPT = '/usr/local/sbin/reset-dnsmasq.sh';

const DOCKER_DAEMON_CONFIG = '/etc/docker/daemon.json';

const NFT_CONF = '/etc/nftables.conf';

const IP_FORWARD_PROC = '/proc/sys/net/ipv4/ip_forward';
const SYSCTL_DROPIN = '/etc/sysctl.d/99-cloud-scripts.conf';
const SYSCTL_DROPIN_CONTENT = `# Managed by marppa cloud-scripts.
# Routing between zone bridges, the host uplink and the physical LAN.
net.ipv4.ip_forward=1
`;

/**
 * Verifies every host prerequisite the app assumes (bridges, nftables, libvirt,
 * passwordless sudo). Runs at startup and again before a system reset, so a
 * misconfigured host fails fast with a remediation hint instead of half-applying
 * network changes.
 */
@Injectable()
export class HostPreflightService {
  constructor(private readonly logger: LoggerService) {}

  public async run(): Promise<void> {
    if (process.env.USE_STUBS === 'true') {
      this.logger.log('Host preflight skipped (USE_STUBS=true).');
      return;
    }

    const problems: string[] = [];

    await this.ensureIpForwarding(problems);
    this.checkEnvVars(problems);
    await this.checkSudo(problems);
    await this.checkBinaries(problems);
    this.checkPaths(problems);
    await this.checkNftables(problems);
    await this.checkNftablesResetSource(problems);
    await this.checkUplink(problems);
    await this.checkVirtualization(problems);
    await this.checkDnsmasqConfDir(problems);
    await this.checkDockerIsolation(problems);

    if (problems.length) {
      throw new Error(
        `Host preflight failed — the host is not ready:\n  - ${problems.join('\n  - ')}`,
      );
    }

    this.logger.log('Host preflight checks passed.');
  }

  /**
   * IP forwarding is something the app owns, not a host precondition: without it
   * no zone can route anywhere, so it is enabled here (and persisted) instead of
   * just being reported as missing. Only a failure to enable it is fatal.
   */
  private async ensureIpForwarding(problems: string[]): Promise<void> {
    let current: string;

    try {
      current = (await fs.promises.readFile(IP_FORWARD_PROC, 'utf8')).trim();
    } catch (err) {
      problems.push(`Could not read ${IP_FORWARD_PROC}: ${this.message(err)}`);
      return;
    }

    if (current !== '1') {
      this.logger.log(
        `IP forwarding is disabled (net.ipv4.ip_forward=${current}); enabling it.`,
      );

      try {
        await Command.runCommand('sudo', [
          'sysctl', '-w', 'net.ipv4.ip_forward=1',
        ]);
      } catch (err) {
        problems.push(
          `Could not enable net.ipv4.ip_forward: ${this.message(err)}. ` +
          "Grant sudo access to 'sysctl' or set it manually.",
        );
        return;
      }

      const applied = (
        await fs.promises.readFile(IP_FORWARD_PROC, 'utf8')
      ).trim();
      if (applied !== '1') {
        problems.push(
          `net.ipv4.ip_forward is still ${applied} after enabling it — routing between zones and the LAN will not work.`,
        );
        return;
      }
    }

    await this.persistIpForwarding();
  }

  /**
   * Persistence is best-effort: forwarding is already live, so a failure here
   * only means the setting would be lost on reboot.
   */
  private async persistIpForwarding(): Promise<void> {
    try {
      if (fs.existsSync(SYSCTL_DROPIN)) {
        const existing = await fs.promises.readFile(SYSCTL_DROPIN, 'utf8');
        if (/^\s*net\.ipv4\.ip_forward\s*=\s*1\s*$/m.test(existing)) return;
      }

      const tmpPath = path.join(os.tmpdir(), `sysctl-cloud-scripts-${Date.now()}`);
      await fs.promises.writeFile(tmpPath, SYSCTL_DROPIN_CONTENT, 'utf8');

      try {
        await Command.runCommand('sudo', [
          'install', '-m', '644', tmpPath, SYSCTL_DROPIN,
        ]);
      } finally {
        await fs.promises.rm(tmpPath, { force: true });
      }

      this.logger.log(`IP forwarding persisted in ${SYSCTL_DROPIN}.`);
    } catch (err) {
      this.logger.warn(
        `Could not persist IP forwarding in ${SYSCTL_DROPIN} (it stays enabled until reboot): ${this.message(err)}`,
      );
    }
  }

  private checkEnvVars(problems: string[]): void {
    const missing = REQUIRED_ENV_VARS.filter((k) => !process.env[k]?.trim());
    if (missing.length) {
      problems.push(`Missing/empty required env vars: ${missing.join(', ')}.`);
    }

    for (const key of NUMERIC_ENV_VARS) {
      const raw = process.env[key]?.trim();
      if (!raw) continue;

      const value = Number(raw);
      if (!Number.isInteger(value) || value <= 0) {
        problems.push(`${key} must be a positive integer (got "${raw}").`);
      }
    }

    const min = Number(process.env.MIN_PORT);
    const max = Number(process.env.MAX_PORT);
    if (Number.isInteger(min) && Number.isInteger(max) && min > max) {
      problems.push(`MIN_PORT (${min}) is greater than MAX_PORT (${max}).`);
    }
  }

  /**
   * Every privileged operation runs through `sudo` non-interactively; without
   * NOPASSWD the first command would block on a password prompt forever.
   */
  private async checkSudo(problems: string[]): Promise<void> {
    try {
      await Command.runCommand('sudo', ['-n', 'true']);
    } catch {
      problems.push(
        `Passwordless sudo is not available for '${os.userInfo().username}', the user ` +
        'running this process. /etc/sudoers.d/cloud-scripts must grant that exact user ' +
        '(see README §1 "Passwordless sudo" for a dev run, §3.2 step 5 for a service).',
      );
    }
  }

  private async checkBinaries(problems: string[]): Promise<void> {
    const missing: string[] = [];

    for (const bin of REQUIRED_BINARIES) {
      try {
        await Command.runCommand('which', [bin]);
      } catch {
        missing.push(bin);
      }
    }

    if (missing.length) {
      problems.push(`Missing required binaries: ${missing.join(', ')}.`);
    }
  }

  private checkPaths(problems: string[]): void {
    const nftResetSource = process.env.NFTABLES_RESET_SOURCE?.trim();
    if (nftResetSource && !fs.existsSync(nftResetSource)) {
      problems.push(
        `NFTABLES_RESET_SOURCE points to a missing file: ${nftResetSource}.`,
      );
    }

    const missingDirs = REQUIRED_DIRS.filter((dir) => !fs.existsSync(dir));
    if (missingDirs.length) {
      problems.push(`Missing required directories: ${missingDirs.join(', ')}.`);
    }

    if (!fs.existsSync(DNSMASQ_RESET_SCRIPT)) {
      problems.push(
        `Missing ${DNSMASQ_RESET_SCRIPT} (used to clear DHCP leases on reset).`,
      );
    }

    if (!fs.existsSync(NFT_CONF)) {
      problems.push(
        `Missing ${NFT_CONF}. Every zone and fiber operation backs it up and rewrites it; ` +
          'create the base ruleset before starting (see README, "nftables base ruleset").',
      );
    }
  }

  private async checkNftablesResetSource(problems: string[]): Promise<void> {
    const resetSource = process.env.NFTABLES_RESET_SOURCE?.trim();
    if (!resetSource || !fs.existsSync(resetSource)) {
      return;
    }

    let contents: string;
    try {
      contents = await Command.runCommand('sudo', ['cat', resetSource]);
    } catch (err) {
      problems.push(
        `Could not read NFTABLES_RESET_SOURCE (${resetSource}): ${this.message(err)}`,
      );
      return;
    }

    const ruleset = NftablesRuleset.stripFlushRuleset(contents);

    const foreign = NftablesRuleset.foreignTables(ruleset);
    if (foreign.length) {
      problems.push(
        `NFTABLES_RESET_SOURCE (${resetSource}) declares tables this app does not own: ` +
          `${foreign.join(', ')}. A system reset would recreate them and clobber whatever ` +
          'owns them (fail2ban, libvirt, docker). Remove them from the base ruleset.',
      );
    }

    const missing = NftablesRuleset.missingTables(ruleset);
    if (missing.length) {
      problems.push(
        `NFTABLES_RESET_SOURCE (${resetSource}) is missing required tables: ` +
          `${missing.join(', ')}. A system reset would leave the host without them.`,
      );
    }
  }

  private async checkNftables(problems: string[]): Promise<void> {
    try {
      const chains = await Command.runCommand('sudo', ['nft', 'list', 'chains']);
      const required = [
        { table: 'inet filter', chain: 'input' },
        { table: 'inet filter', chain: 'forward' },
        { table: 'ip nat', chain: 'prerouting' },
        { table: 'ip nat', chain: 'postrouting' },
      ];

      for (const { table, chain } of required) {
        const re = new RegExp(
          `table ${table.replace(/ /g, '\\s+')}[\\s\\S]*?chain ${chain}\\b`,
        );
        if (!re.test(chains) && !new RegExp(`chain ${chain}\\b`).test(chains)) {
          problems.push(
            `Missing nftables chain '${chain}' in table '${table}'. Restore the base ruleset (NFTABLES_RESET_SOURCE).`,
          );
        }
      }
    } catch (err) {
      problems.push(`Could not list nftables chains: ${this.message(err)}`);
    }
  }

  /**
   * `BRIDGE_NAME` is the host uplink: NAT, DNAT (fibers) and the route back to
   * the physical LAN all hang off it, so a typo there breaks external access
   * silently.
   */
  private async checkUplink(problems: string[]): Promise<void> {
    const uplink = process.env.BRIDGE_NAME?.trim();
    if (!uplink) return;

    try {
      await Command.runCommand('ip', ['link', 'show', uplink]);
    } catch {
      problems.push(
        `BRIDGE_NAME='${uplink}' is not an existing interface on this host.`,
      );
    }
  }

  private async checkVirtualization(problems: string[]): Promise<void> {
    if (!fs.existsSync('/dev/kvm')) {
      problems.push(
        '/dev/kvm is missing: KVM is unavailable (check BIOS virtualization / nested virt).',
      );
    }

    try {
      const state = await Command.runCommand('systemctl', [
        'is-active', 'libvirtd',
      ]);
      if (state.trim() !== 'active') {
        problems.push(
          `libvirtd is not active (${state.trim()}). Run 'sudo systemctl enable --now libvirtd'.`,
        );
      }
    } catch {
      problems.push(
        "libvirtd is not active. Run 'sudo systemctl enable --now libvirtd'.",
      );
    }
  }

  /**
   * Zone DHCP/DNS is written as drop-ins under /etc/dnsmasq.d; if the main
   * config does not include that directory the zones exist but never serve.
   */
  private async checkDnsmasqConfDir(problems: string[]): Promise<void> {
    try {
      const conf = await fs.promises.readFile('/etc/dnsmasq.conf', 'utf8');
      const enabled = conf
        .split('\n')
        .some((line) => /^\s*conf-dir=\/etc\/dnsmasq\.d/.test(line));

      if (!enabled) {
        problems.push(
          "/etc/dnsmasq.conf does not enable 'conf-dir=/etc/dnsmasq.d/,*.conf' — zone DHCP configs would be ignored.",
        );
      }
    } catch (err) {
      problems.push(`Could not read /etc/dnsmasq.conf: ${this.message(err)}`);
    }
  }

  /**
   * Docker is optional (only the Nucleus module needs it), but a daemon that
   * manages packet filtering is not: its chains land in the same `ip nat` /
   * `inet filter` tables the mesh rewrites on every zone and fiber change, and
   * a `SYSTEM_RESET` would wipe them along with fail2ban's. Checked whenever the
   * binary is installed, not only when atoms exist.
   */
  private async checkDockerIsolation(problems: string[]): Promise<void> {
    try {
      await Command.runCommand('which', ['docker']);
    } catch {
      return;
    }

    let config: { iptables?: boolean; ip6tables?: boolean; bridge?: string };
    try {
      config = JSON.parse(await Command.runCommand('sudo', ['cat', DOCKER_DAEMON_CONFIG]));
    } catch (err) {
      problems.push(
        `Docker is installed but ${DOCKER_DAEMON_CONFIG} could not be read as JSON ` +
        `(${this.message(err)}). It must set "iptables": false so the daemon never ` +
        'writes into the nftables tables this app and fail2ban own.',
      );
      return;
    }

    if (config.iptables !== false) {
      problems.push(
        `${DOCKER_DAEMON_CONFIG} does not set "iptables": false — the Docker daemon ` +
        'would insert its own chains into "ip nat" and "inet filter" and they would be ' +
        'dropped on the next zone or fiber change.',
      );
    }

    if (config.ip6tables !== false) {
      problems.push(
        `${DOCKER_DAEMON_CONFIG} does not set "ip6tables": false.`,
      );
    }

    if (config.bridge !== 'none') {
      problems.push(
        `${DOCKER_DAEMON_CONFIG} does not set "bridge": "none" — the default docker0 ` +
        'bridge needs masquerading the app does not provide, so containers on it would ' +
        'silently have no egress.',
      );
    }

    try {
      const chains = await Command.runCommand('sudo', ['nft', 'list', 'chains']);
      const dockerChains = [
        ...new Set(
          [...chains.matchAll(/^\s*chain\s+(DOCKER[\w-]*)\b/gm)].map(([, chain]) => chain),
        ),
      ];

      if (dockerChains.length) {
        problems.push(
          `The live nftables ruleset still has Docker chains (${dockerChains.join(', ')}). ` +
          'Restart the daemon after fixing daemon.json and flush the leftovers.',
        );
      }
    } catch (err) {
      problems.push(`Could not list nftables chains: ${this.message(err)}`);
    }
  }

  private message(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
