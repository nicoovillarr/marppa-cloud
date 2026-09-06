import { Injectable } from '@/decorators/Injectable';
import {
  NucleusService,
  type AtomEnvironment,
  type AtomImageSource,
  type AtomNetworkConfig,
  type AtomResourceSpecs,
  type AtomVolumeMount,
} from '../domain/services/NucleusService';

@Injectable()
export class StubNucleusService extends NucleusService {
  private readonly running = new Set<string>();

  public async ensureAtomImageExists(image: AtomImageSource): Promise<boolean> {
    console.log(`[STUB] ensureAtomImageExists: ${image.repository}:${image.tag}`);
    return true;
  }

  public async ensureZoneNetwork(net: AtomNetworkConfig): Promise<void> {
    console.log(`[STUB] ensureZoneNetwork: zone=${net.zoneId} cidr=${net.cidr}`);
  }

  public async startAtom(
    id: string,
    name: string,
    image: AtomImageSource,
    net: AtomNetworkConfig,
    env: AtomEnvironment,
    specs: AtomResourceSpecs,
    volumes: AtomVolumeMount[],
  ): Promise<void> {
    console.log(
      `[STUB] startAtom: id=${id} name=${name} image=${image.repository}:${image.tag} ` +
      `ip=${net.ipAddress} env=${Object.keys(env).join(',')} ` +
      `cpus=${specs.cpuCores} memory=${specs.ramMB}MB ` +
      `volumes=${volumes.map((volume) => volume.mountPoint).join(',')}`,
    );
    this.running.add(id);
  }

  public async stopAtom(id: string): Promise<boolean> {
    console.log(`[STUB] stopAtom: ${id}`);
    return this.running.delete(id);
  }

  public async deleteAtom(id: string): Promise<boolean> {
    console.log(`[STUB] deleteAtom: ${id}`);
    return this.running.delete(id);
  }

  public async isAtomRunning(id: string): Promise<boolean> {
    return this.running.has(id);
  }

  public async getRunningAtoms(): Promise<string[]> {
    console.log('[STUB] getRunningAtoms');
    return [...this.running];
  }

  public async createAtomVolume(
    volumeId: number,
    sizeGiB: number,
  ): Promise<string> {
    console.log(`[STUB] createAtomVolume: id=${volumeId} size=${sizeGiB}GiB`);
    return `/var/lib/marppa/atom-volumes/${volumeId}`;
  }

  public async deleteAtomVolume(hostPath: string): Promise<boolean> {
    console.log(`[STUB] deleteAtomVolume: ${hostPath}`);
    return true;
  }

  public async ensureAtomVolumeMounted(hostPath: string): Promise<void> {
    console.log(`[STUB] ensureAtomVolumeMounted: ${hostPath}`);
  }

  public async reconcileAtoms(expectedIds: string[]): Promise<string[]> {
    const orphans = [...this.running].filter((id) => !expectedIds.includes(id));
    orphans.forEach((id) => this.running.delete(id));
    console.log(`[STUB] reconcileAtoms: removed ${orphans.length} orphans`);
    return orphans;
  }

  public async reconcileZoneNetworks(expectedZoneIds: string[]): Promise<string[]> {
    console.log(`[STUB] reconcileZoneNetworks: keeping ${expectedZoneIds.length} zones`);
    return [];
  }

  public async forceResetNucleus(): Promise<{
    removedAtoms: string[];
    removedNetworks: string[];
  }> {
    const removedAtoms = await this.reconcileAtoms([]);
    console.log('[STUB] forceResetNucleus');
    return { removedAtoms, removedNetworks: [] };
  }

  public async assertFirewallIsolation(): Promise<void> {
    console.log('[STUB] assertFirewallIsolation');
  }
}
