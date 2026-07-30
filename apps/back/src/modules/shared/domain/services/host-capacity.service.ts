import { Inject, Injectable } from '@nestjs/common';
import {
  HOST_CAPACITY_REPOSITORY_SYMBOL,
  HostCapacityRepository,
} from '../repositories/host-capacity.repository';
import {
  COMMITTED_RESOURCES_REPOSITORY_SYMBOL,
  CommittedResourcesRepository,
} from '../repositories/committed-resources.repository';
import {
  HostCapacityBudget,
  getConfiguredHostCapacityBudget,
  getVcpuOvercommit,
} from '../config/host-capacity.config';
import { HostCapacityExceededError } from '../errors/host-capacity-exceeded.error';

export interface ResourceSpecs {
  cpuCores: number;
  ramMB: number;
  diskGB: number;
}

@Injectable()
export class HostCapacityService {
  constructor(
    @Inject(HOST_CAPACITY_REPOSITORY_SYMBOL)
    private readonly hostCapacityRepository: HostCapacityRepository,

    @Inject(COMMITTED_RESOURCES_REPOSITORY_SYMBOL)
    private readonly committedResourcesRepository: CommittedResourcesRepository,
  ) { }

  async assertFitsOnCreate(specs: ResourceSpecs): Promise<void> {
    const budget = await this.budget();

    this.assertWithinBudget('vCPU', specs.cpuCores, budget.vcpu, '');
    this.assertWithinBudget('memory', specs.ramMB, budget.ramMB, 'MB');

    if (specs.diskGB > 0) {
      const provisioned =
        await this.committedResourcesRepository.sumProvisioned();

      this.assertWithinBudget(
        'disk',
        specs.diskGB,
        budget.diskGB - provisioned.diskGB,
        'GB',
      );
    }
  }

  async assertFitsOnStart(
    resourceId: string,
    specs: ResourceSpecs,
  ): Promise<void> {
    const budget = await this.budget();
    const running =
      await this.committedResourcesRepository.sumRunning(resourceId);

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

  private async budget(): Promise<HostCapacityBudget> {
    const hosts = await this.hostCapacityRepository.findAll();
    if (hosts.length === 0) {
      return getConfiguredHostCapacityBudget();
    }

    const overcommit = getVcpuOvercommit();

    return hosts.reduce<HostCapacityBudget>(
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
      throw new HostCapacityExceededError(
        resource,
        requested,
        Math.max(available, 0),
        unit,
      );
    }
  }
}
