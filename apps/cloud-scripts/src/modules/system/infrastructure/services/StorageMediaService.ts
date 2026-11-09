import { StorageMedia } from '@marppa-cloud/db';
import { Command } from '@/libs/Command';
import { StorageProbe } from '@/libs/StorageProbe';
import { Injectable } from '@/decorators/Injectable';

@Injectable()
export class StorageMediaService {
  private readonly cache = new Map<string, StorageMedia | null>();

  async mediaOf(devices: string[]): Promise<StorageMedia | null> {
    if (devices.length === 0) {
      return null;
    }

    const key = [...devices].sort().join(',');
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const output = await Command.runCommand('lsblk', [
      '--inverse', '--pairs', '--noheadings', '--output', 'TYPE,ROTA,TRAN',
      ...devices,
    ]);

    const media = StorageProbe.mediaOf(output);
    this.cache.set(key, media);

    return media;
  }
}
