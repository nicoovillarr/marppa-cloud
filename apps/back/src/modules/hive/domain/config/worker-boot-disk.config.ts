import { MIN_WORKER_DISK_GB } from '@marppa-cloud/api-types';

const DEFAULT_WORKER_BOOT_DISK_GB = 20;

export function getWorkerBootDiskGB(): number {
  const parsed = Number(process.env.WORKER_BOOT_DISK_GB);
  return Number.isFinite(parsed) && parsed >= MIN_WORKER_DISK_GB
    ? parsed
    : DEFAULT_WORKER_BOOT_DISK_GB;
}
