import { Inject, Injectable } from '@nestjs/common';
import {
  WORKER_REPOSITORY_SYMBOL,
  WorkerRepository,
} from '../repositories/worker.repository';
import {
  HOST_CAPACITY_REPOSITORY_SYMBOL,
  HostCapacityRepository,
} from '../repositories/host-capacity.repository';
import {
  HiveCapacityBudget,
  getConfiguredHiveCapacityBudget,
  getVcpuOvercommit,
} from '../config/hive-capacity.config';
import { HiveCapacityExceededError } from '../errors/hive-capacity-exceeded.error';

export interface WorkerSpecs {
  cpuCores: number;
  ramMB: number;
  diskGB: number;
}

@Injectable()
export class HiveCapacityService {
  constructor(
    @Inject(WORKER_REPOSITORY_SYMBOL)
    private readonly workerRepository: WorkerRepository,

    @Inject(HOST_CAPACITY_REPOSITORY_SYMBOL)
    private readonly hostCapacityRepository: HostCapacityRepository,
  ) { }

  async assertFitsOnCreate(specs: WorkerSpecs): Promise<void> {
    const budget = await this.budget();

    this.assertWithinBudget('vCPU', specs.cpuCores, budget.vcpu, '');
    this.assertWithinBudget('memory', specs.ramMB, budget.ramMB, 'MB');

    const provisioned = await this.workerRepository.sumProvisionedResources();
    this.assertWithinBudget(
      'disk',
      specs.diskGB,
      budget.diskGB - provisioned.diskGB,
      'GB',
    );
  }

  async assertFitsOnStart(workerId: string, specs: WorkerSpecs): Promise<void> {
    const budget = await this.budget();
    const running = await this.workerRepository.sumRunningResources(workerId);

    this.assertWithinBudget(
      'memory',
      specs.ramMB,
      budget.ramMB - running.ramMB,
      'MB',
    );
    this.assertWithinBudget(
      'vCPU',
      specs.cpuCores,
      budget.vcpu - running.cpuCores,
      '',
    );
  }

  private async budget(): Promise<HiveCapacityBudget> {
    const hosts = await this.hostCapacityRepository.findAll();
    if (hosts.length === 0) {
      return getConfiguredHiveCapacityBudget();
    }

    const overcommit = getVcpuOvercommit();

    return hosts.reduce<HiveCapacityBudget>(
      (total, host) => ({
        vcpu: total.vcpu + host.cpuCores * overcommit,
        ramMB: total.ramMB + host.ramMB,
        diskGB: total.diskGB + host.diskGB,
      }),
      { vcpu: 0, ramMB: 0, diskGB: 0 },
    );
  }

  private assertWithinBudget(
    resource: string,
    requested: number,
    available: number,
    unit: string,
  ): void {
    if (requested > available) {
      throw new HiveCapacityExceededError(
        resource,
        requested,
        Math.max(available, 0),
        unit,
      );
    }
  }
}
