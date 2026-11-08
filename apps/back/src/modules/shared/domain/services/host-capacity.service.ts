import { Inject, Injectable } from '@nestjs/common';
import { StorageMedia } from '@marppa-cloud/db';
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
import { HostCapacityModel } from '../models/host-capacity.model';
import { HostUsageModel } from '../models/host-usage.model';

export interface ResourceSpecs {
  cpuCores: number;
  ramMB: number;
  workerDiskGB?: number;
  atomVolumeGB?: number;
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
    const budget = this.budgetOf(await this.hostCapacityRepository.findAll());
    const workerDiskGB = specs.workerDiskGB ?? 0;
    const atomVolumeGB = specs.atomVolumeGB ?? 0;

    this.assertWithinBudget('vCPU', specs.cpuCores, budget.vcpu, '');
    this.assertWithinBudget('memory', specs.ramMB, budget.ramMB, 'MB');

    if (workerDiskGB <= 0 && atomVolumeGB <= 0) {
      return;
    }

    const provisioned = await this.committedResourcesRepository.sumProvisioned();

    if (workerDiskGB > 0) {
      this.assertWithinBudget(
        'worker disk',
        workerDiskGB,
        budget.workerDiskGB - provisioned.workerDiskGB,
        'GB',
      );
    }

    if (atomVolumeGB > 0) {
      this.assertWithinBudget(
        'atom volume storage',
        atomVolumeGB,
        budget.atomVolumeGB - provisioned.atomVolumeGB,
        'GB',
      );
    }
  }

  async assertFitsOnStart(
    resourceId: string,
    specs: ResourceSpecs,
  ): Promise<void> {
    const budget = this.budgetOf(await this.hostCapacityRepository.findAll());
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

  async usage(): Promise<HostUsageModel> {
    const hosts = await this.hostCapacityRepository.findAll();
    const budget = this.budgetOf(hosts);
    const reported = this.reportedOf(hosts);

    const [running, provisioned] = await Promise.all([
      this.committedResourcesRepository.sumRunning(),
      this.committedResourcesRepository.sumProvisioned(),
    ]);

    return {
      source: hosts.length === 0 ? 'CONFIGURED' : 'REPORTED',
      vcpu: {
        running: running.cpuCores,
        provisioned: provisioned.cpuCores,
        budget: budget.vcpu,
        reported: reported.vcpu,
        overcommit: getVcpuOvercommit(),
      },
      ramMB: {
        running: running.ramMB,
        provisioned: provisioned.ramMB,
        budget: budget.ramMB,
        reported: reported.ramMB,
      },
      workerDiskGB: {
        provisioned: provisioned.workerDiskGB,
        budget: budget.workerDiskGB,
        reported: reported.workerDiskGB,
        media: distinctMedia(hosts.map((host) => host.workerDiskMedia)),
      },
      atomVolumeGB: {
        provisioned: provisioned.atomVolumeGB,
        budget: budget.atomVolumeGB,
        reported: reported.atomVolumeGB,
        media: distinctMedia(hosts.map((host) => host.atomVolumeMedia)),
      },
    };
  }

  private reportedOf(hosts: HostCapacityModel[]): HostCapacityBudget {
    if (hosts.length === 0) {
      const configured = getConfiguredHostCapacityBudget();
      return { ...configured, vcpu: configured.vcpu / getVcpuOvercommit() };
    }

    return hosts.reduce<HostCapacityBudget>(
      (total, host) => ({
        vcpu: total.vcpu + host.cpuCores,
        ramMB: total.ramMB + host.ramMB,
        workerDiskGB: total.workerDiskGB + host.workerDiskGB,
        atomVolumeGB: total.atomVolumeGB + host.atomVolumeGB,
      }),
      { vcpu: 0, ramMB: 0, workerDiskGB: 0, atomVolumeGB: 0 },
    );
  }

  private budgetOf(hosts: HostCapacityModel[]): HostCapacityBudget {
    if (hosts.length === 0) {
      return getConfiguredHostCapacityBudget();
    }

    const overcommit = getVcpuOvercommit();

    return hosts.reduce<HostCapacityBudget>(
      (total, host) => ({
        vcpu: total.vcpu + host.effectiveCpuCores * overcommit,
        ramMB: total.ramMB + host.effectiveRamMB,
        workerDiskGB: total.workerDiskGB + host.effectiveWorkerDiskGB,
        atomVolumeGB: total.atomVolumeGB + host.effectiveAtomVolumeGB,
      }),
      { vcpu: 0, ramMB: 0, workerDiskGB: 0, atomVolumeGB: 0 },
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

function distinctMedia(media: (StorageMedia | null)[]): StorageMedia[] {
  return [...new Set(media.filter((value): value is StorageMedia => value != null))];
}
