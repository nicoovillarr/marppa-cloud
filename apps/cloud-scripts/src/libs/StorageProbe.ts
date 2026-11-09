import { StorageMedia } from '@marppa-cloud/db';

const BYTES_PER_GIB = 1024 ** 3;
const LVS_SEPARATOR = '|';
const LSBLK_PAIR = /(\w+)="([^"]*)"/g;
const SEGMENT_SUFFIX = /\(\d+\)$/;

export interface VolumeGroupPool {
  sizeGB: number;
  allocatedGB: number;
  physicalVolumes: string[];
}

export class StorageProbe {
  static readonly LVS_SEPARATOR = LVS_SEPARATOR;

  static mediaOf(lsblkPairs: string): StorageMedia | null {
    const disks = lsblkPairs
      .split('\n')
      .map(parsePairs)
      .filter((row) => row.TYPE === 'disk');

    if (disks.length === 0) {
      return null;
    }

    if (disks.some((disk) => disk.ROTA === '1')) {
      return StorageMedia.HDD;
    }

    if (disks.every((disk) => disk.TRAN === 'nvme')) {
      return StorageMedia.NVME;
    }

    return StorageMedia.SSD;
  }

  static volumeGroupPool(lvsOutput: string, volumePrefix: string): VolumeGroupPool {
    const rows = lvsOutput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, size, vgFree, devices = ''] = line.split(LVS_SEPARATOR);
        return {
          name: name.trim(),
          sizeBytes: Number(size),
          vgFreeBytes: Number(vgFree),
          devices: devices
            .split(',')
            .map((device) => device.trim().replace(SEGMENT_SUFFIX, ''))
            .filter(Boolean),
        };
      });

    if (rows.length === 0) {
      throw new Error('The volume group has no logical volumes to read its free space from');
    }

    const freeBytes = rows[0].vgFreeBytes;
    const allocatedBytes = rows
      .filter((row) => row.name.startsWith(volumePrefix))
      .reduce((total, row) => total + row.sizeBytes, 0);

    if (!Number.isFinite(freeBytes) || !Number.isFinite(allocatedBytes)) {
      throw new Error(`Could not parse the lvs output: ${lvsOutput}`);
    }

    return {
      sizeGB: Math.floor((freeBytes + allocatedBytes) / BYTES_PER_GIB),
      allocatedGB: Math.floor(allocatedBytes / BYTES_PER_GIB),
      physicalVolumes: [...new Set(rows.flatMap((row) => row.devices))],
    };
  }
}

function parsePairs(line: string): Record<string, string> {
  return Object.fromEntries(
    [...line.matchAll(LSBLK_PAIR)].map(([, key, value]) => [key, value]),
  );
}
