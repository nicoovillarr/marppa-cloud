const DEFAULT_HOST_VCPU = 12;
const DEFAULT_HOST_RAM_MB = 24576;
const DEFAULT_HOST_DISK_GB = 380;
const DEFAULT_VCPU_OVERCOMMIT = 2;

export interface HiveCapacityBudget {
  vcpu: number;
  ramMB: number;
  diskGB: number;
}

export function getHiveCapacityBudget(): HiveCapacityBudget {
  return {
    vcpu:
      readPositiveNumber('HIVE_HOST_VCPU', DEFAULT_HOST_VCPU) *
      readPositiveNumber('HIVE_VCPU_OVERCOMMIT', DEFAULT_VCPU_OVERCOMMIT),
    ramMB: readPositiveNumber('HIVE_HOST_RAM_MB', DEFAULT_HOST_RAM_MB),
    diskGB: readPositiveNumber('HIVE_HOST_DISK_GB', DEFAULT_HOST_DISK_GB),
  };
}

function readPositiveNumber(variable: string, fallback: number): number {
  const parsed = Number(process.env[variable]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
