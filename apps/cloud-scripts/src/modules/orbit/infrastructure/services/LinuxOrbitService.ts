import fs from 'fs';
const fsPromises = fs.promises;
import { Command } from '@/libs/Command';
import { PrismaClient, ResourceStatus } from '@marppa-cloud/db';
import { OrbitService } from '../../domain/services/OrbitService';
import { Injectable } from '@/decorators/Injectable';

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

@Injectable()
export class LinuxOrbitService extends OrbitService {
  constructor(private readonly prisma: PrismaClient) {
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

  public async generateNginxConfig(portal, forceTransponder = null) {
    const nginxTree = this.buildNginxTree(
      portal,
      portal.transponders || [],
      forceTransponder,
    );
    const nginxConfig = this.renderNginxBlock(nginxTree);

    const configPath = `/etc/nginx/sites-available/${portal.id}.conf`;
    await fsPromises.writeFile(configPath, nginxConfig, 'utf8');

    const enabledPath = `/etc/nginx/sites-enabled/${portal.id}.conf`;

    try {
      await fsPromises.access(enabledPath);
    } catch {
      await fsPromises.symlink(configPath, enabledPath);
    }

    console.log(nginxConfig);

    console.log(
      `Nginx config for portal ${portal.id} written to ${configPath}`,
    );

    await Command.runCommand('sudo', ['nginx', '-t'], true);
    await Command.runCommand('sudo', ['systemctl', 'restart', 'nginx'], true);
  }

  public async deleteNginxConfig(portalId) {
    const configPath = `/etc/nginx/sites-available/${portalId}.conf`;
    const enabledPath = `/etc/nginx/sites-enabled/${portalId}.conf`;

    for (const filePath of [enabledPath, configPath]) {
      try {
        await fsPromises.unlink(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    console.log(`Nginx config for portal ${portalId} deleted`);
  }

  public async forceResetOrbit() {
    const enabledFiles = (
      await fsPromises.readdir('/etc/nginx/sites-enabled')
    ).filter((file) => file.startsWith('p-'));

    console.log(
      'Removing enabled Nginx config files:',
      enabledFiles.join(', '),
    );

    await Promise.all(
      enabledFiles.map((file) =>
        fsPromises.unlink(`/etc/nginx/sites-enabled/${file}`),
      ),
    );

    const files = (
      await fsPromises.readdir('/etc/nginx/sites-available')
    ).filter((file) => file.startsWith('p-'));

    console.log('Removing available Nginx config files:', files.join(', '));

    await Promise.all(
      files.map((file) =>
        fsPromises.unlink(`/etc/nginx/sites-available/${file}`),
      ),
    );

    try {
      await Command.runCommand('sudo', ['nginx', '-t'], true);
      await Command.runCommand('sudo', ['systemctl', 'restart', 'nginx'], true);
    } catch (error) {
      console.error(`Nginx configuration test failed: ${error.message}`);
    }
  }

  private renderNginxBlock(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    let output = '';

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          output += `${pad}${key} ${v};\n`;
        }
      } else if (typeof value === 'object' && value !== null) {
        output += `${pad}${key} {\n`;
        output += this.renderNginxBlock(value, indent + 1);
        output += `${pad}}\n`;
      } else {
        output += `${pad}${key} ${value};\n`;
      }
    }

    return output;
  }

  private buildNginxTree(portal, transponders, forceTransponder = null) {
    const listen = [];
    if (portal.listenHttp) listen.push('80');
    if (portal.sslCertificate) listen.push('443 ssl');

    const locations = transponders
      .filter((t) => t.node || t.customIPAddress)
      .filter(
        (t) =>
          t.status === ResourceStatus.ACTIVE ||
          (forceTransponder &&
            t.id === forceTransponder &&
            t.status === ResourceStatus.QUEUED),
      )
      .sort((a, b) => b.priority - a.priority)
      .flatMap(this.buildLocationBlock)
      .reduce((acc, loc) => ({ ...acc, ...loc }), {});

    if (Object.keys(locations).length === 0) {
      console.warn(
        `No enabled transponders with nodes found for portal ${portal.id}`,
      );
    }
    const server = {
      server: {
        listen,
        server_name:
          portal.address + (portal.defaultServer ? ' default_server' : ''),
        ...(portal.sslCertificate && {
          ssl_certificate: portal.sslCertificate,
        }),
        ...(portal.sslKey && { ssl_certificate_key: portal.sslKey }),
        ...(portal.enableCompression && { gzip: 'on' }),
        ...(portal.corsEnabled && {
          add_header: ['Access-Control-Allow-Origin *'],
        }),
        ...locations,
      },
    };

    return server;
  }

  private buildLocationBlock(t) {
    const ip = t.node?.ipAddress || t.customIPAddress;
    if (!ip) {
      console.warn(`No IP address found for transponder ${t.id}`);
      return {};
    }

    const inner: any = {
      proxy_pass: `http://${ip}:${t.port}`,
      proxy_http_version: '1.1',
      ...(t.cacheEnabled && { proxy_cache: t.id }),
      ...(t.gzipEnabled && { gzip: 'on' }),
      ...(t.allowCookies === false && {
        proxy_cookie_domain: 'off',
        proxy_cookie_path: 'off',
      }),
      ...(t.proxyReadTimeout && {
        proxy_read_timeout: `${t.proxyReadTimeout}s`,
      }),
    };

    if (t.addHeaders && Object.keys(t.addHeaders).length) {
      inner.add_header = Object.entries(t.addHeaders).map(
        ([h, v]) => `${h} ${v}`,
      );
    }

    if (t.proxyHeaders && Object.keys(t.proxyHeaders).length) {
      inner.proxy_set_header = Object.entries(t.proxyHeaders).map(
        ([h, v]) => `${h} ${v}`,
      );
    }

    return { [`location ${t.path}`]: inner };
  }
}
