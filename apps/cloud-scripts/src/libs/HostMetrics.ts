const KIB = 1024;
const MIB = 1024 ** 2;
const DEVICE_SOURCE = /^\/dev\/[^\s[]+/;
const FINDMNT_PAIR = /(\w+)="([^"]*)"/g;

export interface CpuTimes {
  totalTicks: number;
  idleTicks: number;
}

export interface MemoryInfo {
  totalMB: number;
  usedMB: number;
}

export interface CgroupUsage {
  cpuUsageUsec: number;
  workingSetBytes: number;
}

export interface FilesystemUsage {
  mountPoint: string;
  device: string;
  fsType: string;
  sizeBytes: number;
  usedBytes: number;
}

export class HostMetrics {
  static cpuTimes(procStat: string): CpuTimes {
    const line = procStat.split('\n').find((row) => /^cpu\s/.test(row));
    if (!line) {
      throw new Error('/proc/stat has no aggregate cpu line');
    }

    const [user, nice, system, idle, iowait = 0, irq = 0, softirq = 0, steal = 0] = line
      .trim()
      .split(/\s+/)
      .slice(1)
      .map(Number);

    return {
      totalTicks: user + nice + system + idle + iowait + irq + softirq + steal,
      idleTicks: idle + iowait,
    };
  }

  static cpuPercent(previous: CpuTimes, current: CpuTimes): number {
    const total = current.totalTicks - previous.totalTicks;
    if (total <= 0) {
      return 0;
    }

    const busy = total - (current.idleTicks - previous.idleTicks);
    return clampPercent((busy / total) * 100);
  }

  static memoryInfo(procMeminfo: string): MemoryInfo {
    const fields = Object.fromEntries(
      procMeminfo
        .split('\n')
        .map((line) => line.match(/^(\w+):\s+(\d+)/))
        .filter((match): match is RegExpMatchArray => match != null)
        .map(([, key, value]) => [key, Number(value)]),
    );

    if (fields.MemTotal == null || fields.MemAvailable == null) {
      throw new Error('/proc/meminfo has no MemTotal or MemAvailable');
    }

    return {
      totalMB: Math.floor((fields.MemTotal * KIB) / MIB),
      usedMB: Math.floor(((fields.MemTotal - fields.MemAvailable) * KIB) / MIB),
    };
  }

  static cgroupCpuUsageUsec(cpuStat: string): number {
    const match = cpuStat.match(/^usage_usec\s+(\d+)/m);
    if (!match) {
      throw new Error('cpu.stat has no usage_usec');
    }

    return Number(match[1]);
  }

  static cgroupWorkingSetBytes(memoryCurrent: string, memoryStat: string): number {
    const current = Number(memoryCurrent.trim());
    const inactiveFile = Number(memoryStat.match(/^inactive_file\s+(\d+)/m)?.[1] ?? 0);

    if (!Number.isFinite(current)) {
      throw new Error(`memory.current is not a number: ${memoryCurrent}`);
    }

    return Math.max(current - inactiveFile, 0);
  }

  static platformCpuPercent(
    previous: Map<string, CgroupUsage>,
    current: Map<string, CgroupUsage>,
    elapsedUsec: number,
    cores: number,
  ): number {
    if (elapsedUsec <= 0 || cores <= 0) {
      return 0;
    }

    let usedUsec = 0;
    for (const [cgroup, usage] of current) {
      const before = previous.get(cgroup);
      if (before && usage.cpuUsageUsec >= before.cpuUsageUsec) {
        usedUsec += usage.cpuUsageUsec - before.cpuUsageUsec;
      }
    }

    return clampPercent((usedUsec / (elapsedUsec * cores)) * 100);
  }

  static platformMemoryMB(cgroups: Map<string, CgroupUsage>): number {
    let bytes = 0;
    for (const usage of cgroups.values()) {
      bytes += usage.workingSetBytes;
    }

    return Math.floor(bytes / MIB);
  }

  static filesystems(findmntPairs: string, excludedPrefixes: string[]): FilesystemUsage[] {
    const seen = new Set<string>();
    const filesystems: FilesystemUsage[] = [];

    for (const line of findmntPairs.split('\n')) {
      const row = Object.fromEntries(
        [...line.matchAll(FINDMNT_PAIR)].map(([, key, value]) => [key, value]),
      );

      const device = row.SOURCE?.match(DEVICE_SOURCE)?.[0];
      const mountPoint = row.TARGET;
      if (!device || !mountPoint || seen.has(device)) {
        continue;
      }

      if (excludedPrefixes.some((prefix) => mountPoint.startsWith(prefix))) {
        continue;
      }

      const sizeBytes = Number(row.SIZE);
      const usedBytes = Number(row.USED);
      if (!Number.isFinite(sizeBytes) || !Number.isFinite(usedBytes)) {
        continue;
      }

      seen.add(device);
      filesystems.push({ mountPoint, device, fsType: row.FSTYPE ?? '', sizeBytes, usedBytes });
    }

    return filesystems;
  }
}

function clampPercent(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100) * 10) / 10;
}
