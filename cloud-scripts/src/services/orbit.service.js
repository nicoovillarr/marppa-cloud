const fs = require('fs');
const fsPromises = fs.promises;
const cache = require('../libs/cache');
const runCommand = require('../libs/run-command');
const prisma = require('../libs/prisma');
const { ResourceStatus } = require('@prisma/client');

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

async function createPortal(id, address, type, apiKey) {
  console.log(`Creating portal ${id} (${address}) of type ${type}`);
  await updateDynamicDNS(id, address, type, apiKey);
  console.log(`Portal ${id} created successfully`);
}

async function updateDynamicDNS(id, address, type, apiKey) {
  await batchUpdateDynamicDNS(
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

/**
 * Get the public IP address of the server.
 * @returns {Promise<string|null>} The public IP address or null if not found.
 */
async function getPublicIPAddress() {
  const cachedIP = cache.get('public-ip');
  if (cachedIP) {
    return cachedIP;
  }

  try {
    const ip = await fetch('https://api.ipify.org').then((res) => res.text());
    cache.set('public-ip', ip);
    return ip;
  } catch (err) {
    console.error('Error getting public IP:', err);
    return null;
  }
}

/**
 * Batch update Dynamic DNS for multiple portals.
 * @param {{
 *   id: string,
 *   address: string
 *   type: string,
 *   apiKey: string,
 * }} portals - Array of portal objects
 * @param {string} [ip] - Optional IP address to set; if not provided, fetches current public IP
 * @returns
 */
async function batchUpdateDynamicDNS(portals, ip) {
  if (portals.length === 0) return;

  if (!ip) {
    ip = await getPublicIPAddress();

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
              await updateCloudflareDNS(portal.apiKey, portal.address, ip);
              prismaTransactions.push(
                prisma.portal.update({
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
    await prisma.$transaction(prismaTransactions);
  }
}

/**
 * Creates or updates a Cloudflare DNS record.
 * @param {string} apiToken Cloudflare API token with DNS edit permissions
 * @param {string} domain Full domain name (e.g. dev.domain.com)
 * @param {string} ip New IP address
 * @param {object} [options] Optional config (type, ttl, proxied)
 */
async function updateCloudflareDNS(apiToken, domain, ip, options = {}) {
  const { type = 'A', ttl = 120, proxied = false } = options;

  // Extract root domain (zone name)
  const parts = domain.split('.');
  const zoneName = parts.slice(-2).join('.'); // e.g. domain.com

  // 1. Get zone ID
  const zoneRes = await fetch(`${CLOUDFLARE_API}/zones?name=${zoneName}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const zoneData = await zoneRes.json();
  const zone = zoneData.result?.[0];
  if (!zone) throw new Error(`Zone not found for ${zoneName}`);

  // 2. Try to find existing record
  const dnsRes = await fetch(
    `${CLOUDFLARE_API}/zones/${zone.id}/dns_records?name=${domain}`,
    { headers: { Authorization: `Bearer ${apiToken}` } },
  );
  const dnsData = await dnsRes.json();
  const record = dnsData.result?.[0];

  // 3. Create or update record
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
      name: domain, // full name (e.g. dev.domain.com)
      content: ip,
      ttl,
      proxied,
    }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(
      `Failed to ${record ? 'update' : 'create'} record: ${JSON.stringify(
        data.errors,
      )}`,
    );
  }

  console.log(`✅ Record ${record ? 'updated' : 'created'}: ${domain} → ${ip}`);
  return data.result;
}

/**
 * Generates the Nginx configuration for a portal and its transponders.
 * @param {Object} portal - Portal object that contains portal settings and transponders info.
 * @param {String|null} forceTransponder - Optional transponder id to force include in config when its status is QUEUED.
 */
async function generateNginxConfig(portal, forceTransponder = null) {
  const nginxTree = buildNginxTree(
    portal,
    portal.transponders || [],
    forceTransponder,
  );
  const nginxConfig = renderNginxBlock(nginxTree);

  const configPath = `/etc/nginx/sites-available/${portal.id}.conf`;
  await fsPromises.writeFile(configPath, nginxConfig, 'utf8');

  const enabledPath = `/etc/nginx/sites-enabled/${portal.id}.conf`;

  // add symlink if not exists
  try {
    await fsPromises.access(enabledPath);
  } catch {
    await fsPromises.symlink(configPath, enabledPath);
  }

  console.log(nginxConfig);

  console.log(`Nginx config for portal ${portal.id} written to ${configPath}`);

  try {
    await runCommand('sudo', ['nginx', '-t'], true);
    await runCommand('sudo', ['systemctl', 'restart', 'nginx'], true);
  } catch (error) {
    console.error(`Nginx configuration test failed: ${error.message}`);
  }
}

/**
 * Deletes the Nginx configuration files for a portal.
 * @param {string} portalId - The ID of the portal whose Nginx config should be deleted.
 */
async function deleteNginxConfig(portalId) {
  const configPath = `/etc/nginx/sites-available/${portalId}.conf`;
  const enabledPath = `/etc/nginx/sites-enabled/${portalId}.conf`;

  try {
    await fsPromises.unlink(configPath);
    await fsPromises.unlink(enabledPath);
    console.log(`Nginx config for portal ${portalId} deleted`);
  } catch (error) {
    console.error(
      `Failed to delete Nginx config for portal ${portalId}: ${error.message}`,
    );
  }
}

/**
 * Force reset the Nginx configuration by removing all existing config files and restarting Nginx.
 */
async function forceResetOrbit() {
  const enabledFiles = (
    await fsPromises.readdir('/etc/nginx/sites-enabled')
  ).filter((file) => file.startsWith('p-'));

  console.log('Removing enabled Nginx config files:', enabledFiles.join(', '));

  await Promise.all(
    enabledFiles.map((file) =>
      fsPromises.unlink(`/etc/nginx/sites-enabled/${file}`),
    ),
  );

  const files = (await fsPromises.readdir('/etc/nginx/sites-available')).filter(
    (file) => file.startsWith('p-'),
  );

  console.log('Removing available Nginx config files:', files.join(', '));

  await Promise.all(
    files.map((file) =>
      fsPromises.unlink(`/etc/nginx/sites-available/${file}`),
    ),
  );

  try {
    await runCommand('sudo', ['nginx', '-t'], true);
    await runCommand('sudo', ['systemctl', 'restart', 'nginx'], true);
  } catch (error) {
    console.error(`Nginx configuration test failed: ${error.message}`);
  }
}

function renderNginxBlock(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let output = '';

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        output += `${pad}${key} ${v};\n`;
      }
    } else if (typeof value === 'object' && value !== null) {
      output += `${pad}${key} {\n`;
      output += renderNginxBlock(value, indent + 1);
      output += `${pad}}\n`;
    } else {
      output += `${pad}${key} ${value};\n`;
    }
  }

  return output;
}

/**
 * Builds the Nginx configuration tree for a portal and its transponders.
 * @param {Object} portal - Portal object
 * @param {Array} transponders - Array of transponder objects
 * @param {String|null} forceTransponder - Optional transponder id to force include in config when its status is QUEUED.
 * @returns {Object} Nginx configuration tree
 */
function buildNginxTree(portal, transponders, forceTransponder = null) {
  const listen = [];
  if (portal.listenHttp) listen.push('80');
  // if (portal.listenHttps) listen.push('443 ssl');

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
    .flatMap(buildLocationBlock)
    .reduce((acc, loc) => ({ ...acc, ...loc }), {});

  if (Object.keys(locations).length === 0) {
    console.warn(
      `No enabled transponders with nodes found for portal ${portal.id}`,
    );
  }
  const server = {
    server: {
      listen: listen.join(' '),
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

function buildLocationBlock(t) {
  const ip = t.node?.ipAddress || t.customIPAddress;
  if (!ip) {
    console.warn(`No IP address found for transponder ${t.id}`);
    return {};
  }

  const inner = {
    proxy_pass: `http://${ip}:${t.port}`,
    proxy_http_version: '1.1',
    ...(t.cacheEnabled && { proxy_cache: t.id }),
    ...(t.gzipEnabled && { gzip: 'on' }),
    ...(t.allowCookies === false && {
      proxy_cookie_domain: 'off',
      proxy_cookie_path: 'off',
    }),
    ...(t.proxyReadTimeout && { proxy_read_timeout: `${t.proxyReadTimeout}s` }),
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

module.exports = {
  createPortal,
  getPublicIPAddress,
  updateDynamicDNS,
  batchUpdateDynamicDNS,
  generateNginxConfig,
  deleteNginxConfig,
  forceResetOrbit,
};
