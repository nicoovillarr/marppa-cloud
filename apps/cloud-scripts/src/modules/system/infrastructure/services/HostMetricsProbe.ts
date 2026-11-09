import fs from 'fs';
import os from 'os';
import path from 'path';
import { StorageMedia } from '@marppa-cloud/db';
import { Command } from '@/libs/Command';
import { Injectable } from '@/decorators/Injectable';
import {
  CgroupUsage,
  CpuTimes,
  FilesystemUsage,
  HostMetrics,
  MemoryInfo,
} from '@/libs/HostMetrics';
import { StorageProbe } from '@/libs/StorageProbe';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { ATOM_VOLUME_PREFIX, atomVolumeGroup } from '@/nucleus/domain/AtomVolumeGroup';
import { StorageMediaService } from './StorageMediaService';

const CGROUP_ROOT = '/sys/fs/cgroup';
const VIRTUAL_MACHINE_SLICE = 'machine.slice';
const ATOM_LABEL = 'marppa.atom';
const CONTAINER_ID = /^[a-f0-9]{64}$/;
const EXCLUDED_MOUNT_PREFIXES = ['/var/lib/docker/', '/run/', '/snap/'];

export interface FilesystemReading extends FilesystemUsage {
  media: StorageMedia | null;
}

export interface AtomVolumePoolReading {
  sizeGB: number;
  allocatedGB: number;
}

export interface HostMetricsReading {
  takenAtUsec: number;
  cores: number;
  loadAverage1m: number;
  cpuTimes: CpuTimes;
  memory: MemoryInfo;
  platformCgroups: Map<string, CgroupUsage> | null;
  filesystems: FilesystemReading[];
  atomVolumePool: AtomVolumePoolReading | null;
}

@Injectable()
export class HostMetricsProbe {
  private readonly warned = new Set<string>();

  constructor(
    private readonly logger: LoggerService,
    private readonly storageMedia: StorageMediaService,
  ) {}

  async read(): Promise<HostMetricsReading> {
    const [procStat, procMeminfo, platformCgroups, filesystems, atomVolumePool] =
      await Promise.all([
        fs.promises.readFile('/proc/stat', 'utf8'),
        fs.promises.readFile('/proc/meminfo', 'utf8'),
        this.optional('platform cgroups', () => this.readPlatformCgroups()),
        this.optional('filesystems', () => this.readFilesystems()),
        this.optional('atom volume pool', () => this.readAtomVolumePool()),
      ]);

    return {
      takenAtUsec: Number(process.hrtime.bigint() / 1000n),
      cores: os.cpus().length,
      loadAverage1m: os.loadavg()[0],
      cpuTimes: HostMetrics.cpuTimes(procStat),
      memory: HostMetrics.memoryInfo(procMeminfo),
      platformCgroups,
      filesystems: filesystems ?? [],
      atomVolumePool,
    };
  }

  private async readPlatformCgroups(): Promise<Map<string, CgroupUsage>> {
    if (!fs.existsSync(path.join(CGROUP_ROOT, 'cgroup.controllers'))) {
      throw new Error(`${CGROUP_ROOT} is not a cgroup v2 hierarchy`);
    }

    const cgroups = [
      path.join(CGROUP_ROOT, VIRTUAL_MACHINE_SLICE),
      ...(await this.atomCgroups()),
    ].filter((cgroup) => fs.existsSync(cgroup));

    const usages = await Promise.all(
      cgroups.map(async (cgroup) => [cgroup, await this.readCgroup(cgroup)] as const),
    );

    return new Map(usages);
  }

  private async atomCgroups(): Promise<string[]> {
    let output: string;
    try {
      output = await Command.runCommand('sudo', [
        'docker', 'ps', '--filter', `label=${ATOM_LABEL}`, '--no-trunc', '--quiet',
      ]);
    } catch {
      return [];
    }

    return output
      .split('\n')
      .map((id) => id.trim())
      .filter((id) => CONTAINER_ID.test(id))
      .map((id) =>
        [
          path.join(CGROUP_ROOT, 'system.slice', `docker-${id}.scope`),
          path.join(CGROUP_ROOT, 'docker', id),
        ].find((candidate) => fs.existsSync(candidate)),
      )
      .filter((cgroup): cgroup is string => cgroup != null);
  }

  private async readCgroup(cgroup: string): Promise<CgroupUsage> {
    const [cpuStat, memoryCurrent, memoryStat] = await Promise.all([
      fs.promises.readFile(path.join(cgroup, 'cpu.stat'), 'utf8'),
      fs.promises.readFile(path.join(cgroup, 'memory.current'), 'utf8'),
      fs.promises.readFile(path.join(cgroup, 'memory.stat'), 'utf8'),
    ]);

    return {
      cpuUsageUsec: HostMetrics.cgroupCpuUsageUsec(cpuStat),
      workingSetBytes: HostMetrics.cgroupWorkingSetBytes(memoryCurrent, memoryStat),
    };
  }

  private async readFilesystems(): Promise<FilesystemReading[]> {
    const output = await Command.runCommand('findmnt', [
      '--list', '--noheadings', '--bytes', '--pairs',
      '--output', 'TARGET,SOURCE,FSTYPE,SIZE,USED',
    ]);

    const filesystems = HostMetrics.filesystems(output, EXCLUDED_MOUNT_PREFIXES);

    return Promise.all(
      filesystems.map(async (filesystem) => ({
        ...filesystem,
        media: await this.storageMedia.mediaOf([filesystem.device]).catch(() => null),
      })),
    );
  }

  private async readAtomVolumePool(): Promise<AtomVolumePoolReading> {
    const output = await Command.runCommand('sudo', [
      'lvs', '--noheadings', '--nosuffix', '--units', 'b',
      '--separator', StorageProbe.LVS_SEPARATOR,
      '--options', 'lv_name,lv_size,vg_free,devices',
      atomVolumeGroup(),
    ]);

    const pool = StorageProbe.volumeGroupPool(output, ATOM_VOLUME_PREFIX);

    return { sizeGB: pool.sizeGB, allocatedGB: pool.allocatedGB };
  }

  private async optional<T>(label: string, read: () => Promise<T>): Promise<T | null> {
    try {
      const value = await read();
      this.warned.delete(label);
      return value;
    } catch (err) {
      if (!this.warned.has(label)) {
        this.warned.add(label);
        this.logger.warn(
          `[HostMetricsProbe] Could not read ${label}; reporting it as unknown: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return null;
    }
  }
}
