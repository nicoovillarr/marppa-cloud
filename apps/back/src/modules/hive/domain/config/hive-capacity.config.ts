const DEFAULT_HOST_VCPU = 12;
const DEFAULT_HOST_RAM_MB = 32026;
const DEFAULT_HOST_DISK_GB = 439;
const DEFAULT_VCPU_OVERCOMMIT = 2;

export interface HiveCapacityBudget {
  vcpu: number;
  ramMB: number;
  diskGB: number;
}

export function getVcpuOvercommit(): number {
  return readPositiveNumber('HIVE_VCPU_OVERCOMMIT', DEFAULT_VCPU_OVERCOMMIT);
}

export function getConfiguredHiveCapacityBudget(): HiveCapacityBudget {
  return {
    vcpu: readPositiveNumber('HIVE_HOST_VCPU', DEFAULT_HOST_VCPU) * getVcpuOvercommit(),
    ramMB: readPositiveNumber('HIVE_HOST_RAM_MB', DEFAULT_HOST_RAM_MB),
    diskGB: readPositiveNumber('HIVE_HOST_DISK_GB', DEFAULT_HOST_DISK_GB),
  };
}

function readPositiveNumber(variable: string, fallback: number): number {
  const parsed = Number(process.env[variable]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
