import fs from 'fs';
const fsPromises = fs.promises;
import { Command } from '@/libs/Command';
import { ResourceStatus } from '@marppa-cloud/db';
import { OrbitService } from '../../domain/services/OrbitService';
import { Injectable } from '@/decorators/Injectable';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { isIPv4 } from 'net';
import path from 'path';
import os from 'os';

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';


interface PortalConfig {
  id: string;
  address: string;
  defaultServer?: boolean | null;
  listenHttp?: boolean | null;
  sslCertificate?: string | null;
  sslKey?: string | null;
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
  customIPAddress?: string | null;
  addHeaders?: Record<string, string> | null;
  proxyHeaders?: Record<string, string> | null;
  node?: { ipAddress?: string | null } | null;
}

@Injectable()
export class LinuxOrbitService extends OrbitService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async createPortal(id, address, type, apiKey) {
    console.log(`Creating portal ${id} (${address}) of type ${type}`);
    await this.updateDynamicDNS(id, address, type, apiKey);
    console.log(`Portal ${id} created successfully`);
  }

  public async updateDynamicDNS(id, address, type, apiKey) {
    await this.batchUpdateDynamicDNS(
      [
        {
          id,
          address,
          type,
          apiKey,
        },
      ],
      null,
    );
  }

  public async getPublicIPAddress() {
    try {
      const ip = await fetch('https://api.ipify.org').then((res) => res.text());
      return ip;
    } catch (err) {
      console.error('Error getting public IP:', err);
      return null;
    }
  }

  public async batchUpdateDynamicDNS(portals, ip) {
    if (portals.length === 0) return;

    if (!ip) {
      ip = await this.getPublicIPAddress();

      if (!ip) {
        console.warn('No public IP found, skipping DNS update');
        return;
      }
    }

    const batchSize = 4;

    const prismaTransactions = [];

    for (let i = 0; i < portals.length; i += batchSize) {
      const batch = portals.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (portal) => {
          try {
            console.log(
              `Updating dynamic DNS records for portal ${portal.id} to point to IP: ${ip}`,
            );

            switch (portal.type.toLowerCase()) {
              case 'cloudflare':
                await this.updateCloudflareDNS(
                  portal.apiKey,
                  portal.address,
                  ip,
                );
                prismaTransactions.push(
                  this.prisma.portal.update({
                    where: { id: portal.id },
                    data: { lastPublicIP: ip, lastSyncAt: new Date() },
                  }),
                );
                break;
              default:
                console.warn(
                  `Unknown portal type ${portal.type} for portal ${portal.id}`,
                );
            }
          } catch (error) {
            console.error(`Error updating DNS for portal ${portal.id}:`, error);
          }
        }),
      );
    }

    if (prismaTransactions.length > 0) {
      await this.prisma.$transaction(prismaTransactions);
    }
  }

  public async updateCloudflareDNS(apiToken, domain, ip, options: any = {}) {
    const { type = 'A', ttl = 120, proxied = false } = options;

    const parts = domain.split('.');
    const zoneName = parts.slice(-2).join('.');

    const zoneRes = await fetch(`${CLOUDFLARE_API}/zones?name=${zoneName}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const zoneData: any = await zoneRes.json();
    const zone = zoneData.result?.[0];
    if (!zone) throw new Error(`Zone not found for ${zoneName}`);

    const dnsRes = await fetch(
      `${CLOUDFLARE_API}/zones/${zone.id}/dns_records?name=${domain}`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
    );
    const dnsData: any = await dnsRes.json();
    const record = dnsData.result?.[0];

    const url = record
      ? `${CLOUDFLARE_API}/zones/${zone.id}/dns_records/${record.id}`
      : `${CLOUDFLARE_API}/zones/${zone.id}/dns_records`;

    const method = record ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        type,
        name: domain,
        content: ip,
        ttl,
        proxied,
      }),
    });

    const data: any = await res.json();
    if (!data.success) {
      throw new Error(
        `Failed to ${record ? 'update' : 'create'} record: ${JSON.stringify(
          data.errors,
        )}`,
      );
    }

    console.log(
      `✅ Record ${record ? 'updated' : 'created'}: ${domain} → ${ip}`,
    );
    return data.result;
  }

  private readonly caddySitesDir = '/etc/caddy/sites';

  private caddySitePath(portalId: string): string {
    return `${this.caddySitesDir}/${portalId}.caddy`;
  }

  private async writeRootFile(destPath: string, content: string): Promise<void> {
    const tmpPath = path.join(
      os.tmpdir(),
      `orbit-${path.basename(destPath)}-${Date.now()}`,
    );

    await fsPromises.writeFile(tmpPath, content, { encoding: 'utf8' });

    try {
      await Command.runCommand('sudo', ['mkdir', '-p', path.dirname(destPath)]);
      await Command.runCommand('sudo', ['install', '-m', '644', tmpPath, destPath]);
    } finally {
      await fsPromises.rm(tmpPath, { force: true });
    }
  }

  private async removeRootFile(filePath: string): Promise<void> {
    await Command.runCommand('sudo', ['rm', '-f', filePath]);
  }

  private buildTransponderRoute(t: TransponderConfig): string[] {
    const ip = t.node?.ipAddress || t.customIPAddress;
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

    for (const [header, value] of Object.entries(t.proxyHeaders ?? {})) {
      proxyBody.push(
        `\t\t\theader_up ${this.sanitizeHeaderName(header)} ${this.sanitizeHeaderValue(value)}`,
      );
    }

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

    for (const [header, value] of Object.entries(t.addHeaders ?? {})) {
      lines.push(
        `\t\t\theader ${this.sanitizeHeaderName(header)} ${this.sanitizeHeaderValue(value)}`,
      );
    }

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
    if (portal.defaultServer) {
      console.warn(
        `Portal ${portal.id} is flagged as default server, which has no direct ` +
        'Caddy equivalent. Serving it on its own address only.',
      );
    }

    const routes = transponders
      .filter((t) => t.node || t.customIPAddress)
      .filter(
        (t) =>
          t.status === ResourceStatus.ACTIVE ||
          (forceTransponder &&
            t.id === forceTransponder &&
            t.status === ResourceStatus.QUEUED),
      )
      .sort((a, b) => b.priority - a.priority)
      .flatMap((t) => this.buildTransponderRoute(t));

    if (!routes.length) {
      console.warn(
        `No enabled transponders with nodes found for portal ${portal.id}`,
      );
    }

    const lines = [`${this.sanitizeServerName(portal.address)} {`];

    if (portal.enableCompression) lines.push('\tencode gzip zstd');
    if (portal.corsEnabled) lines.push('\theader Access-Control-Allow-Origin *');

    lines.push('\troute {');
    lines.push(...routes);
    lines.push('\t}');
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

    console.log(`Caddy config for portal ${portalId} deleted`);
  }

  public async reconcileOrbit(expectedPortalIds: string[]): Promise<string[]> {
    const expected = new Set(expectedPortalIds);
    const removed = new Set<string>();

    const orphansIn = async (dir: string): Promise<string[]> => {
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
        .filter((file) => file.startsWith('p-') && file.endsWith('.caddy'))
        .filter((file) => !expected.has(file.slice(0, -6)));
    };

    const orphans = await orphansIn(this.caddySitesDir);
    if (orphans.length) {
      console.log(
        `Removing orphan Caddy configs from ${this.caddySitesDir}:`,
        orphans.join(', '),
      );
    }

    for (const file of orphans) {
      await this.removeRootFile(`${this.caddySitesDir}/${file}`);
      removed.add(file.slice(0, -6));
    }

    if (removed.size) {
      try {
        await this.reloadCaddy();
      } catch (error) {
        console.error(`Caddy configuration reload failed: ${error.message}`);
      }
    }

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

  private sanitizeHeaderName(headerName: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(headerName)) {
      throw new Error(`Invalid header name: ${headerName}`);
    }

    return headerName;
  }

  private sanitizeHeaderValue(headerValue: string): string {
    return this.sanitizeConfigValue(headerValue, 'header value');
  }

  private sanitizeConfigValue(value: string, label: string): string {
    if (/[\n\r;{}]/.test(value)) {
      throw new Error(`Invalid ${label}: ${value}`);
    }

    return value;
  }
}
