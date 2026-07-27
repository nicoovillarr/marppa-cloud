import { forbiddenCapabilities } from '@marppa-cloud/shared';
import { Command } from '@/libs/Command';
import { Injectable } from '@/decorators/Injectable';
import {
  NucleusService,
  type AtomEnvironment,
  type AtomImageSource,
  type AtomNetworkConfig,
} from '../domain/services/NucleusService';

const ATOM_LABEL = 'marppa.atom';
const ZONE_LABEL = 'marppa.zone';

const SAFE_ATOM_ID = /^a-[a-z0-9]+$/;
const SAFE_ZONE_ID = /^z-[a-z0-9]+$/;
const SAFE_DNS_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const SAFE_ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_ENV_VALUE = /^[^\r\n\0]*$/;
const SAFE_REGISTRY = /^[a-z0-9.\-]+(:\d+)?$/;
const SAFE_REPOSITORY = /^[a-z0-9]+([._\-/][a-z0-9]+)*$/;
const SAFE_TAG = /^[\w][\w.\-]{0,127}$/;
const SAFE_DIGEST = /^sha256:[a-f0-9]{64}$/;
const SAFE_CAPABILITY = /^[A-Z_]+$/;
const SAFE_SYSCTL_KEY = /^[a-z0-9._]+$/;
const SAFE_SYSCTL_VALUE = /^[A-Za-z0-9._\-]+$/;
const SAFE_LIMIT = /^[0-9]+(\.[0-9]+)?[a-z]?$/;

/**
 * What is added back after dropping everything: the set an image needs to run
 * its entrypoint as root and step down to its own user. Notably absent from
 * Docker's default set are `NET_RAW` (raw sockets — the ARP spoofing and port
 * scanning primitive between atoms sharing a zone bridge), `MKNOD`, `SYS_CHROOT`
 * and `SETFCAP`.
 */
const BASELINE_CAPABILITIES = [
  'CHOWN',
  'DAC_OVERRIDE',
  'FOWNER',
  'SETGID',
  'SETUID',
  'KILL',
];


/**
 * Every container is attached to its zone's bridge with its node's IP and no
 * published port. Traffic in and out is therefore governed exclusively by the
 * mesh's own nftables rules (masquerade per zone, DNAT per fiber) — which is
 * what keeps the Docker daemon out of `inet filter` / `ip nat` and away from
 * fail2ban's `inet f2b-table`. `-p` / `--publish` must never appear here.
 */
@Injectable()
export class DockerNucleusService extends NucleusService {
  public async ensureAtomImageExists(image: AtomImageSource): Promise<boolean> {
    const ref = this.imageRef(image);

    console.log(`Pulling atom image: ${ref}`);
    await this.docker(['pull', '--platform', `linux/${image.architecture}`, ref]);

    return true;
  }

  /**
   * Maps a Docker network onto the zone bridge the mesh already created. The
   * bridge pre-exists, so Docker adopts it instead of creating (and later
   * deleting) one, and masquerading is disabled because the zone's own
   * postrouting rules already do it — with the RFC1918 carve-outs this would
   * otherwise trample.
   */
  public async ensureZoneNetwork(net: AtomNetworkConfig): Promise<void> {
    await this.assertFirewallIsolation();

    const zoneId = this.assertZoneId(net.zoneId);

    if (await this.networkExists(zoneId)) {
      return;
    }

    console.log(`Creating docker network ${zoneId} on the existing zone bridge`);

    await this.docker([
      'network', 'create',
      '--driver', 'bridge',
      '--subnet', net.cidr,
      '--gateway', net.gateway,
      '--opt', `com.docker.network.bridge.name=${zoneId}`,
      '--opt', 'com.docker.network.bridge.enable_ip_masquerade=false',
      '--opt', 'com.docker.network.bridge.enable_icc=true',
      '--label', `${ZONE_LABEL}=${zoneId}`,
      zoneId,
    ]);
  }

  public async startAtom(
    id: string,
    name: string,
    image: AtomImageSource,
    net: AtomNetworkConfig,
    env: AtomEnvironment,
  ): Promise<void> {
    const atomId = this.assertAtomId(id);
    const zoneId = this.assertZoneId(net.zoneId);
    const alias = this.assertDnsLabel(name);

    await this.ensureZoneNetwork(net);
    await this.deleteAtom(atomId);

    const args = [
      'run', '--detach',
      '--name', atomId,
      '--hostname', alias,
      '--label', `${ATOM_LABEL}=${atomId}`,
      '--label', `${ZONE_LABEL}=${zoneId}`,
      '--network', zoneId,
      '--ip', net.ipAddress,
      '--network-alias', alias,
      '--restart', 'unless-stopped',
      ...this.hardeningArgs(),
      ...this.envArgs(env),
      ...this.capabilityArgs(image),
      ...this.sysctlArgs(image),
      this.imageRef(image),
    ];

    console.log(`Starting atom ${atomId} on ${zoneId} at ${net.ipAddress}`);
    await this.docker(args);
  }

  public async stopAtom(id: string): Promise<void> {
    const atomId = this.assertAtomId(id);

    if (!(await this.containerExists(atomId))) {
      console.log(`Atom container ${atomId} does not exist, nothing to stop`);
      return;
    }

    await this.docker(['rm', '--force', atomId]);
  }

  /**
   * Identical to stopping: the container is rebuilt from the row on every start,
   * so there is no stopped container worth keeping around.
   */
  public deleteAtom(id: string): Promise<void> {
    return this.stopAtom(id);
  }

  public async isAtomRunning(id: string): Promise<boolean> {
    const atomId = this.assertAtomId(id);

    const output = await this.docker([
      'ps', '--quiet', '--filter', `name=^${atomId}$`,
    ]);

    return output.trim().length > 0;
  }

  public async getRunningAtoms(): Promise<string[]> {
    const output = await this.docker([
      'ps', '--filter', `label=${ATOM_LABEL}`, '--format', '{{.Names}}',
    ]);

    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  public async reconcileAtoms(expectedIds: string[]): Promise<string[]> {
    const output = await this.docker([
      'ps', '--all', '--filter', `label=${ATOM_LABEL}`, '--format', '{{.Names}}',
    ]);

    const running = output.split('\n').map((line) => line.trim()).filter(Boolean);
    const expected = new Set(expectedIds);
    const orphans = running.filter((name) => !expected.has(name));

    for (const orphan of orphans) {
      console.log(`Removing orphan atom container ${orphan}`);
      await this.docker(['rm', '--force', orphan]);
    }

    return orphans;
  }

  public async reconcileZoneNetworks(expectedZoneIds: string[]): Promise<string[]> {
    const output = await this.docker([
      'network', 'ls', '--filter', `label=${ZONE_LABEL}`, '--format', '{{.Name}}',
    ]);

    const networks = output.split('\n').map((line) => line.trim()).filter(Boolean);
    const expected = new Set(expectedZoneIds);
    const orphans = networks.filter((name) => !expected.has(name));

    for (const orphan of orphans) {
      console.log(`Removing orphan docker network ${orphan}`);
      await this.docker(['network', 'rm', orphan]);
    }

    return orphans;
  }

  /**
   * Atoms are torn down before their networks: Docker refuses to remove a
   * network that still has an endpoint attached.
   */
  public async forceResetNucleus(): Promise<{
    removedAtoms: string[];
    removedNetworks: string[];
  }> {
    const removedAtoms = await this.reconcileAtoms([]);
    const removedNetworks = await this.reconcileZoneNetworks([]);

    return { removedAtoms, removedNetworks };
  }

  public async assertFirewallIsolation(): Promise<void> {
    const chains = await Command.runCommand('sudo', ['nft', 'list', 'chains']);

    const dockerChains = [...chains.matchAll(/^\s*chain\s+(DOCKER[\w-]*)\b/gm)].map(
      ([, chain]) => chain,
    );

    if (dockerChains.length) {
      throw new Error(
        `The Docker daemon is managing packet filtering (found nftables chains: ${[
          ...new Set(dockerChains),
        ].join(', ')}). Set "iptables": false in /etc/docker/daemon.json and restart it ` +
        'before running atoms, or it will clobber the mesh and fail2ban rules.',
      );
    }
  }

  private async networkExists(zoneId: string): Promise<boolean> {
    const output = await this.docker([
      'network', 'ls', '--quiet', '--filter', `name=^${zoneId}$`,
    ]);

    return output.trim().length > 0;
  }

  private async containerExists(atomId: string): Promise<boolean> {
    const output = await this.docker([
      'ps', '--all', '--quiet', '--filter', `name=^${atomId}$`,
    ]);

    return output.trim().length > 0;
  }

  private imageRef(image: AtomImageSource): string {
    const registry = this.assertMatches(
      image.registry, SAFE_REGISTRY, 'image registry',
    );
    const repository = this.assertMatches(
      image.repository, SAFE_REPOSITORY, 'image repository',
    );

    if (image.digest) {
      const digest = this.assertMatches(image.digest, SAFE_DIGEST, 'image digest');
      return `${registry}/${repository}@${digest}`;
    }

    const tag = this.assertMatches(image.tag, SAFE_TAG, 'image tag');
    return `${registry}/${repository}:${tag}`;
  }

  private envArgs(env: AtomEnvironment): string[] {
    return Object.entries(env).flatMap(([key, value]) => [
      '--env',
      `${this.assertMatches(key, SAFE_ENV_KEY, 'env var name')}=${this.assertMatches(
        value, SAFE_ENV_VALUE, 'env var value',
      )}`,
    ]);
  }

  /**
   * Atoms of different companies live in different zones, but the host is
   * shared: an unbounded container starves the workers and every other zone's
   * atoms long before anyone notices.
   */
  private hardeningArgs(): string[] {
    return [
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      '--pids-limit', this.limit('ATOM_PIDS_LIMIT', '512'),
      '--memory', this.limit('ATOM_MEMORY_LIMIT', '1g'),
      '--cpus', this.limit('ATOM_CPU_LIMIT', '1'),
    ];
  }

  private limit(variable: string, fallback: string): string {
    const configured = process.env[variable]?.trim();
    if (!configured) {
      return fallback;
    }

    return this.assertMatches(configured, SAFE_LIMIT, variable);
  }

  private capabilityArgs(image: AtomImageSource): string[] {
    const baseline = BASELINE_CAPABILITIES.flatMap((capability) => [
      '--cap-add',
      capability,
    ]);

    const capabilities = (image.capabilities ?? []).map((capability) =>
      this.assertMatches(capability, SAFE_CAPABILITY, 'capability'),
    );

    const forbidden = forbiddenCapabilities(capabilities);
    if (forbidden.length) {
      throw new Error(
        `Refusing to grant ${forbidden.join(', ')}: equivalent to root on the host, ` +
        'which would let this container disable the nftables rules isolating every zone.',
      );
    }

    const requested = capabilities.flatMap((capability) => ['--cap-add', capability]);

    return [...baseline, ...requested];
  }

  private sysctlArgs(image: AtomImageSource): string[] {
    const sysctls = (image.sysctls ?? {}) as Record<string, unknown>;

    return Object.entries(sysctls).flatMap(([key, value]) => [
      '--sysctl',
      `${this.assertMatches(key, SAFE_SYSCTL_KEY, 'sysctl name')}=${this.assertMatches(
        String(value), SAFE_SYSCTL_VALUE, 'sysctl value',
      )}`,
    ]);
  }

  private assertAtomId(id: string): string {
    return this.assertMatches(id, SAFE_ATOM_ID, 'atom id');
  }

  private assertZoneId(id: string): string {
    return this.assertMatches(id, SAFE_ZONE_ID, 'zone id');
  }

  private assertDnsLabel(name: string): string {
    return this.assertMatches(name, SAFE_DNS_LABEL, 'atom name');
  }

  private assertMatches(value: string, pattern: RegExp, label: string): string {
    if (!pattern.test(value)) {
      throw new Error(`Invalid ${label}: ${value}`);
    }

    return value;
  }

  private docker(args: string[]): Promise<string> {
    return Command.runCommand('sudo', ['docker', ...args]);
  }
}
