import { Inject, Injectable } from '@nestjs/common';
import {
  WORKER_REPOSITORY_SYMBOL,
  WorkerRepository,
} from '../repositories/worker.repository';
import { getHiveCapacityBudget } from '../config/hive-capacity.config';
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
  ) { }

  async assertFitsOnCreate(specs: WorkerSpecs): Promise<void> {
    const budget = getHiveCapacityBudget();

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
    const budget = getHiveCapacityBudget();
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
