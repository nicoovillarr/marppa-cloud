import type { Atom, AtomImage } from '@marppa-cloud/db';

export const NUCLEUS_SERVICE_TOKEN = Symbol('NUCLEUS_SERVICE');

export type AtomImageSource = Pick<
  AtomImage,
  | 'registry'
  | 'repository'
  | 'tag'
  | 'digest'
  | 'architecture'
  | 'capabilities'
  | 'sysctls'
  | 'command'
>;

/**
 * Where an atom sits in the mesh. Containers are attached to the zone bridge the
 * mesh already owns and addressed with their node's IP, so egress NAT and port
 * publishing keep coming from the app's own nftables rules — Docker never needs
 * to write a firewall rule of its own.
 */
export type AtomNetworkConfig = {
  zoneId: string;
  cidr: string;
  gateway: string;
  ipAddress: string;
};

export type AtomEnvironment = Record<string, string>;

export type AtomResourceSpecs = Pick<Atom, 'cpuCores' | 'ramMB'>;

export abstract class NucleusService {
  abstract ensureAtomImageExists(image: AtomImageSource): Promise<boolean>;

  abstract ensureZoneNetwork(net: AtomNetworkConfig): Promise<void>;

  abstract startAtom(
    id: string,
    name: string,
    image: AtomImageSource,
    net: AtomNetworkConfig,
    env: AtomEnvironment,
    specs: AtomResourceSpecs,
  ): Promise<void>;

  abstract stopAtom(id: string): Promise<void>;

  abstract deleteAtom(id: string): Promise<void>;

  abstract isAtomRunning(id: string): Promise<boolean>;

  abstract getRunningAtoms(): Promise<string[]>;

  abstract reconcileAtoms(expectedIds: string[]): Promise<string[]>;

  /**
   * Drops the Docker network mapped onto a zone bridge once that zone is gone.
   * The bridge itself belongs to the mesh, which deletes it directly — without
   * this the network object survives pointing at a device that no longer exists.
   */
  abstract reconcileZoneNetworks(expectedZoneIds: string[]): Promise<string[]>;

  abstract forceResetNucleus(): Promise<{ removedAtoms: string[]; removedNetworks: string[] }>;

  /**
   * Fails if the Docker daemon has started managing packet filtering. Everything
   * here assumes `iptables: false`, and a daemon that lost that setting would
   * insert its own chains into the tables the mesh rewrites on every zone change.
   */
  abstract assertFirewallIsolation(): Promise<void>;
}
