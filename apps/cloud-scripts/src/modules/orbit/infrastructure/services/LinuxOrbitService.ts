import fs from 'fs';
const fsPromises = fs.promises;
import { Command } from '@/libs/Command';
import { PortalType, ResourceStatus } from '@marppa-cloud/db';
import {
  OrbitService,
  PortalDnsRecord,
  PortalDnsSyncOptions,
} from '../../domain/services/OrbitService';
import { Injectable } from '@/decorators/Injectable';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { isIPv4 } from 'net';
import path from 'path';
import os from 'os';

const PUBLIC_IP_URL = 'https://api.ipify.org';
const DDCLIENT_TTL_SECONDS = 120;
const DDCLIENT_TIMEOUT_MS = 30_000;


interface PortalConfig {
  id: string;
  address: string;
  enableCompression?: boolean | null;
  corsEnabled?: boolean | null;
  transponders?: TransponderConfig[];
}

interface TransponderConfig {
  id: string;
  path: string;
  port: number;
  priority: number;
  status: ResourceStatus;
  cacheEnabled?: boolean | null;
  gzipEnabled?: boolean | null;
  allowCookies?: boolean | null;
  proxyReadTimeout?: number | null;
  node?: { ipAddress?: string | null } | null;
}

@Injectable()
export class LinuxOrbitService extends OrbitService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async syncPortalDns(
    portal: PortalDnsRecord,
    options: PortalDnsSyncOptions = {},
  ): Promise<void> {
    const ip = await this.getPublicIPAddress();
    if (!ip) {
      throw new Error(`No public IP found, cannot sync DNS for portal ${portal.id}`);
    }

    await this.runDdclient(portal, options.force === true);
    await this.recordDnsSync(portal.id, ip);
  }

  public async getPublicIPAddress() {
    try {
      const ip = await fetch(PUBLIC_IP_URL).then((res) => res.text());
      return ip;
    } catch (err) {
      console.error('Error getting public IP:', err);
      return null;
    }
  }

  public async batchSyncPortalDns(
    portals: PortalDnsRecord[],
    ip: string | null,
    options: PortalDnsSyncOptions = {},
  ): Promise<void> {
    if (portals.length === 0) return;

    if (!ip) {
      ip = await this.getPublicIPAddress();

      if (!ip) {
        console.warn('No public IP found, skipping DNS update');
        return;
      }
    }

    const batchSize = 4;
    const synced: string[] = [];

    for (let i = 0; i < portals.length; i += batchSize) {
      const batch = portals.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (portal) => {
          try {
            console.log(
              `Updating dynamic DNS records for portal ${portal.id} to point to IP: ${ip}`,
            );

            await this.runDdclient(portal, options.force === true);
            synced.push(portal.id);
          } catch (error) {
            console.error(`Error updating DNS for portal ${portal.id}:`, error);
          }
        }),
      );
    }

    if (synced.length > 0) {
      await this.recordDnsSync(synced, ip);
    }
  }

  private async recordDnsSync(
    portalIds: string | string[],
    ip: string,
  ): Promise<void> {
    const ids = Array.isArray(portalIds) ? portalIds : [portalIds];

    await this.prisma.portal.updateMany({
      where: { id: { in: ids } },
      data: { lastPublicIP: ip, lastSyncAt: new Date() },
    });
  }

  private readonly ddclientConfigDir = '/etc/ddclient/portals';
  private readonly ddclientCacheDir = '/var/cache/ddclient/portals';

  private ddclientConfigPath(portalId: string): string {
    return `${this.ddclientConfigDir}/${portalId}.conf`;
  }

  private ddclientCachePath(portalId: string): string {
    return `${this.ddclientCacheDir}/${portalId}.cache`;
  }

  private cloudflareZoneOf(address: string): string {
    return address.split('.').slice(-2).join('.');
  }

  private buildDdclientConfig(portal: PortalDnsRecord): string {
    if (portal.type !== PortalType.CLOUDFLARE) {
      throw new Error(
        `Unsupported portal type ${portal.type} for portal ${portal.id}; only ${PortalType.CLOUDFLARE} is supported`,
      );
    }

    const address = this.sanitizeServerName(portal.address);

    return [
      `# Managed by marppa-cloud — portal ${portal.id}. Manual edits are overwritten.`,
      '# No `daemon` line on purpose: setting it makes ddclient fork, and the parent',
      '# then exits 0 before the update happens, hiding every failure from the caller.',
      'syslog=no',
      'ssl=yes',
      `cache=${this.ddclientCachePath(portal.id)}`,
      'usev4=webv4',
      `webv4=${PUBLIC_IP_URL}`,
      'protocol=cloudflare',
      `zone=${this.cloudflareZoneOf(address)}`,
      `ttl=${DDCLIENT_TTL_SECONDS}`,
      'login=token',
      `password=${this.sanitizeDdclientValue(portal.apiKey, 'API token')}`,
      address,
      '',
    ].join('\n');
  }

  private async runDdclient(
    portal: PortalDnsRecord,
    force: boolean,
  ): Promise<void> {
    const configPath = this.ddclientConfigPath(portal.id);

    await Command.runCommand('sudo', ['mkdir', '-p', this.ddclientCacheDir]);
    await this.writeRootFile(configPath, this.buildDdclientConfig(portal), '600');

    const args = ['ddclient', '-file', configPath];
    if (force) args.push('-force');

    const output = await Command.runCommand(
      'sudo',
      args,
      false,
      DDCLIENT_TIMEOUT_MS,
    );

    if (/FAILED/i.test(output)) {
      throw new Error(`ddclient failed for portal ${portal.id}:\n${output}`);
    }

    if (output) console.log(output);
  }

  private async removeDdclientConfig(portalId: string): Promise<void> {
    await this.removeRootFile(this.ddclientConfigPath(portalId));
    await this.removeRootFile(this.ddclientCachePath(portalId));
  }

  private readonly caddySitesDir = '/etc/caddy/sites';

  private caddySitePath(portalId: string): string {
    return `${this.caddySitesDir}/${portalId}.caddy`;
  }

  private async writeRootFile(
    destPath: string,
    content: string,
    mode = '644',
  ): Promise<void> {
    const tmpPath = path.join(
      os.tmpdir(),
      `orbit-${path.basename(destPath)}-${Date.now()}`,
    );

    await fsPromises.writeFile(tmpPath, content, { encoding: 'utf8', mode: 0o600 });

    try {
      await Command.runCommand('sudo', ['mkdir', '-p', path.dirname(destPath)]);
      await Command.runCommand('sudo', ['install', '-m', mode, tmpPath, destPath]);
    } finally {
      await fsPromises.rm(tmpPath, { force: true });
    }
  }

  private async removeRootFile(filePath: string): Promise<void> {
    await Command.runCommand('sudo', ['rm', '-f', filePath]);
  }

  private buildTransponderRoute(t: TransponderConfig): string[] {
    const ip = t.node?.ipAddress;
    if (!ip) {
      console.warn(`No IP address found for transponder ${t.id}`);
      return [];
    }

    if (t.cacheEnabled) {
      console.warn(
        `Transponder ${t.id} requests caching, which Caddy does not support ` +
        'without a plugin. Serving it uncached.',
      );
    }

    const target = `http://${this.sanitizeProxyTarget(ip)}:${this.sanitizePort(t.port)}`;
    const proxyBody: string[] = [];

    if (t.allowCookies === false) {
      proxyBody.push('\t\t\theader_up -Cookie');
      proxyBody.push('\t\t\theader_down -Set-Cookie');
    }

    if (t.proxyReadTimeout) {
      proxyBody.push('\t\t\ttransport http {');
      proxyBody.push(`\t\t\t\tread_timeout ${Number(t.proxyReadTimeout)}s`);
      proxyBody.push('\t\t\t}');
    }

    const lines = [`\t\thandle ${this.sanitizeLocationPath(t.path)}* {`];

    if (t.gzipEnabled) lines.push('\t\t\tencode gzip');

    if (proxyBody.length) {
      lines.push(`\t\t\treverse_proxy ${target} {`);
      lines.push(...proxyBody);
      lines.push('\t\t\t}');
    } else {
      lines.push(`\t\t\treverse_proxy ${target}`);
    }

    lines.push('\t\t}');

    return lines;
  }

  private buildCaddySite(
    portal: PortalConfig,
    transponders: TransponderConfig[],
    forceTransponder: string | null = null,
  ): string {
    const routes = transponders
      .filter((t) => t.node)
      .filter(
        (t) =>
          t.status === ResourceStatus.ACTIVE ||
          (forceTransponder &&
            t.id === forceTransponder &&
            t.status === ResourceStatus.QUEUED),
      )
      .sort((a, b) => b.priority - a.priority)
      .flatMap((t) => this.buildTransponderRoute(t));

    const lines = [`${this.sanitizeServerName(portal.address)} {`];

    if (portal.enableCompression) lines.push('\tencode gzip zstd');
    if (portal.corsEnabled) lines.push('\theader Access-Control-Allow-Origin *');

    if (routes.length) {
      lines.push('\troute {');
      lines.push(...routes);
      lines.push('\t}');
    } else {
      console.warn(
        `No enabled transponders with nodes found for portal ${portal.id}`,
      );
      lines.push('\trespond "No transponders configured for this portal" 503');
    }

    lines.push('}');

    return `${lines.join('\n')}\n`;
  }

  private async reloadCaddy(): Promise<void> {
    await Command.runCommand('sudo', ['caddy', 'validate', '--config', '/etc/caddy/Caddyfile'], true);
    await Command.runCommand('sudo', ['systemctl', 'reload', 'caddy'], true);
  }

  public async generatePortalConfig(portal, forceTransponder = null) {
    const config = this.buildCaddySite(
      portal,
      portal.transponders || [],
      forceTransponder,
    );

    const configPath = this.caddySitePath(portal.id);
    await this.writeRootFile(configPath, config);

    console.log(config);
    console.log(`Caddy config for portal ${portal.id} written to ${configPath}`);

    await this.reloadCaddy();
  }

  public async deletePortalConfig(portalId) {
    await this.removeRootFile(this.caddySitePath(portalId));
    await this.reloadCaddy();
    await this.removeDdclientConfig(portalId);

    console.log(`Caddy and ddclient config for portal ${portalId} deleted`);
  }

  public async reconcileOrbit(expectedPortalIds: string[]): Promise<string[]> {
    const expected = new Set(expectedPortalIds);
    const removed = new Set<string>();

    const orphansIn = async (dir: string, suffix: string): Promise<string[]> => {
      let entries: string[];
      try {
        entries = await fsPromises.readdir(dir);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log(`${dir} does not exist, nothing to reconcile there`);
          return [];
        }

        throw error;
      }

      return entries
        .filter((file) => file.startsWith('p-') && file.endsWith(suffix))
        .filter((file) => !expected.has(file.slice(0, -suffix.length)));
    };

    const removeOrphansIn = async (dir: string, suffix: string): Promise<void> => {
      const orphans = await orphansIn(dir, suffix);
      if (orphans.length) {
        console.log(`Removing orphan configs from ${dir}:`, orphans.join(', '));
      }

      for (const file of orphans) {
        await this.removeRootFile(`${dir}/${file}`);
        removed.add(file.slice(0, -suffix.length));
      }
    };

    await removeOrphansIn(this.caddySitesDir, '.caddy');

    if (removed.size) {
      try {
        await this.reloadCaddy();
      } catch (error) {
        console.error(`Caddy configuration reload failed: ${error.message}`);
      }
    }

    await removeOrphansIn(this.ddclientConfigDir, '.conf');
    await removeOrphansIn(this.ddclientCacheDir, '.cache');

    return [...removed];
  }

  public async forceResetOrbit(): Promise<string[]> {
    return this.reconcileOrbit([]);
  }

  private sanitizeProxyTarget(ip: string): string {
    const value = this.sanitizeConfigValue(ip, 'proxy target IP');
    if (!isIPv4(value)) {
      throw new Error(`Invalid proxy target IP: ${ip}`);
    }
    return value;
  }

  private sanitizePort(port: number): number {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid proxy port: ${port}`);
    }

    return port;
  }

  private sanitizeLocationPath(locationPath: string): string {
    const value = this.sanitizeConfigValue(locationPath, 'route path');
    if (!/^\/[A-Za-z0-9\-._~\/]*$/.test(value)) {
      throw new Error(`Invalid route path: ${locationPath}`);
    }

    return value;
  }

  private sanitizeServerName(serverName: string): string {
    const value = this.sanitizeConfigValue(serverName, 'site address');
    if (!/^[A-Za-z0-9*._-]+$/.test(value)) {
      throw new Error(`Invalid site address: ${serverName}`);
    }

    return value;
  }

  private sanitizeDdclientValue(value: string, label: string): string {
    if (!/^[A-Za-z0-9_.-]+$/.test(value)) {
      throw new Error(`Invalid ${label} for ddclient config`);
    }

    return value;
  }

  private sanitizeConfigValue(value: string, label: string): string {
    if (/[\n\r;{}]/.test(value)) {
      throw new Error(`Invalid ${label}: ${value}`);
    }

    return value;
  }
}
