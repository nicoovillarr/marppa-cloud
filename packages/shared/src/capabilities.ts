/**
 * Linux capabilities an approved container image may ask the host for, sorted by
 * blast radius. Enforced in two processes — the backend refuses to create an
 * atom, the worker refuses to start one — so the classification lives here
 * rather than in either of them.
 */

/**
 * Root on the host under another name. `SYS_MODULE` loads a kernel module, which
 * is one step from unloading the nftables rules that isolate every zone;
 * `SYS_ADMIN` covers mount and namespace operations that walk straight out of
 * the container. Refused for everyone, root company included: no approval
 * upstream can make them safe.
 */
export const FORBIDDEN_CAPABILITIES: ReadonlySet<string> = new Set([
  'ALL',
  'BPF',
  'DAC_READ_SEARCH',
  'MAC_ADMIN',
  'MAC_OVERRIDE',
  'PERFMON',
  'SYS_ADMIN',
  'SYS_BOOT',
  'SYS_MODULE',
  'SYS_PTRACE',
  'SYS_RAWIO',
]);

/**
 * Capabilities whose damage stops at the container's own network namespace and,
 * through it, the zone it sits in. A zone only ever holds one company's
 * resources, so the worst case is self-inflicted and never crosses a tenant.
 *
 * `NET_ADMIN` cannot sniff the zone bridge on its own: packet capture and ARP
 * forging go through `AF_PACKET`, which needs `NET_RAW` — dropped by the
 * container baseline and absent from this list.
 */
export const TENANT_SAFE_CAPABILITIES: ReadonlySet<string> = new Set([
  'NET_ADMIN',
  'NET_BIND_SERVICE',
]);

export const forbiddenCapabilities = (capabilities: readonly string[]): string[] =>
  capabilities.filter((capability) => FORBIDDEN_CAPABILITIES.has(capability));

/**
 * Anything not explicitly classified as tenant-safe is root-company only, so a
 * capability nobody has reviewed is restricted by default instead of slipping
 * through unnoticed.
 */
export const rootOnlyCapabilities = (capabilities: readonly string[]): string[] =>
  capabilities.filter((capability) => !TENANT_SAFE_CAPABILITIES.has(capability));
