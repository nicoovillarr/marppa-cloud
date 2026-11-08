const SAFE_VOLUME_GROUP = /^[A-Za-z0-9._+-]+$/;
const DEFAULT_VOLUME_GROUP = 'vg_data';

export const ATOM_VOLUME_PREFIX = 'atomvol-';

export function atomVolumeGroup(): string {
  const configured = process.env.ATOM_VOLUME_GROUP?.trim();
  if (!configured) {
    return DEFAULT_VOLUME_GROUP;
  }

  if (!SAFE_VOLUME_GROUP.test(configured)) {
    throw new Error(`Invalid volume group: ${configured}`);
  }

  return configured;
}

export function atomVolumeName(id: number): string {
  return `${ATOM_VOLUME_PREFIX}${id}`;
}
