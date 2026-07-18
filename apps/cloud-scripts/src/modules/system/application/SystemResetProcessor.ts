import { EventType } from '@marppa-cloud/db';
import { IEventProcessor } from '@/event/application/EventWorker';
import type { EventPayload } from '@/event/domain/models/EventPayload';
import { MESH_SERVICE_TOKEN, MeshService } from '@/mesh/domain/services/MeshService';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '@/orbit/domain/services/OrbitService';
import { HIVE_SERVICE_TOKEN, HiveService } from '@/worker/domain/services/HiveService';

import { EventProcessor } from '@/decorators/EventProcessor';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { EVENT_REPOSITORY_TOKEN, EventRepository } from '@/event/domain/repositories/EventRepository';
import { Inject } from '@/decorators/Inject';
import { Command } from '@/libs/Command';
import fs from 'fs';

const REQUIRED_BINARIES = [
  'nmap', 'ipcalc', 'nft', 'dnsmasq', 'virsh', 'virt-install',
  'virt-customize', 'genisoimage', 'guestfish', 'qemu-img', 'wget', 'ping', 'arp',
];

const REQUIRED_ENV_VARS = [
  'BRIDGE_NAME', 'USERNAME', 'MIN_PORT', 'MAX_PORT',
  'NFTABLES_RESET_SOURCE', 'ALLOWED_IMAGE_DOMAINS',
];

@EventProcessor(EventType.SYSTEM_RESET)
export class SystemResetProcessor implements IEventProcessor {

  constructor(
    private readonly logger: LoggerService,
    
    @Inject(EVENT_REPOSITORY_TOKEN)
    private readonly repository: EventRepository,

    @Inject(HIVE_SERVICE_TOKEN)
    private readonly hiveService: HiveService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) {}

  public async handle(event: EventPayload): Promise<void> {
    try {
      await this.preflight();

      await this.hiveService.forceResetHive();
      await this.meshService.forceResetMesh();
      await this.orbitService.forceResetOrbit();

      await this.repository.createEvent(
        EventType.SYSTEM_RESET_SUCCESS,
        event.createdBy,
        event.companyId,
      );

      this.logger.log('System reset process completed successfully.');
    } catch (error) {
      await this.repository.createEvent(
        EventType.SYSTEM_RESET_FAILED,
        event.createdBy,
        event.companyId,
      );

      this.logger.error(`System reset failed: ${String(error)}`);

      throw error;
    }
  }

  /**
   * Verifies host prerequisites the app assumes (runbook §1, §5) before any
   * teardown/reset runs. Fails fast with a descriptive error rather than
   * proceeding into an inconsistent state.
   */
  private async preflight(): Promise<void> {
    const problems: string[] = [];

    // 1. IP forwarding (runbook §5.1) — nothing in the app sets this.
    try {
      const ipForward = (await fs.promises.readFile('/proc/sys/net/ipv4/ip_forward', 'utf8')).trim();
      if (ipForward !== '1') {
        problems.push(
          `IP forwarding is disabled (net.ipv4.ip_forward=${ipForward}). ` +
          `Enable it: 'sudo sysctl -w net.ipv4.ip_forward=1' and persist in /etc/sysctl.conf.`,
        );
      }
    } catch (err) {
      problems.push(`Could not read /proc/sys/net/ipv4/ip_forward: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Required env vars.
    const missingEnv = REQUIRED_ENV_VARS.filter((k) => !process.env[k]?.trim());
    if (missingEnv.length) {
      problems.push(`Missing/empty required env vars: ${missingEnv.join(', ')}.`);
    }

    // 3. nftables base ruleset restore source must exist (used by forceResetMesh).
    const nftResetSource = process.env.NFTABLES_RESET_SOURCE?.trim();
    if (nftResetSource && !fs.existsSync(nftResetSource)) {
      problems.push(`NFTABLES_RESET_SOURCE points to a missing file: ${nftResetSource}.`);
    }

    // 4. nftables base tables/chains the app appends rules to must already exist.
    try {
      const chains = await Command.runCommand('sudo', ['nft', 'list', 'chains']);
      const required = [
        { table: 'inet filter', chain: 'input' },
        { table: 'inet filter', chain: 'forward' },
        { table: 'ip nat', chain: 'prerouting' },
        { table: 'ip nat', chain: 'postrouting' },
      ];
      for (const { table, chain } of required) {
        const re = new RegExp(`table ${table.replace(/ /g, '\\s+')}[\\s\\S]*?chain ${chain}\\b`);
        if (!re.test(chains) && !new RegExp(`chain ${chain}\\b`).test(chains)) {
          problems.push(`Missing nftables chain '${chain}' in table '${table}'. Restore the base ruleset (NFTABLES_RESET_SOURCE).`);
        }
      }
    } catch (err) {
      problems.push(`Could not list nftables chains: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 5. Required system binaries.
    const missingBins: string[] = [];
    for (const bin of REQUIRED_BINARIES) {
      try {
        await Command.runCommand('which', [bin]);
      } catch {
        missingBins.push(bin);
      }
    }
    if (missingBins.length) {
      problems.push(`Missing required binaries: ${missingBins.join(', ')}.`);
    }

    if (problems.length) {
      throw new Error(
        `Host preflight failed — cannot run system reset:\n  - ${problems.join('\n  - ')}`,
      );
    }

    this.logger.log('Host preflight checks passed.');
  }
}

