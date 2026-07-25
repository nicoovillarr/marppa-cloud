import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceStatus } from '@marppa-cloud/db';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { WorkerService } from '@/hive/domain/services/worker.service';
import {
  WORKER_SSH_KEY_REPOSITORY_SYMBOL,
  WorkerSshKeyRepository,
} from '@/hive/domain/repositories/worker-ssh-key.repository';
import { WorkerSshKeyModel } from '@/hive/domain/models/worker-ssh-key.model';
import { CreateWorkerSshKeyDto } from '@/hive/presentation/dtos/create-worker-ssh-key.dto';

const OPENSSH_PUBLIC_KEY =
  /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[a-z0-9-]+)\s+[A-Za-z0-9+/=]+(\s+\S+)?$/;

@Injectable()
export class WorkerSshKeyApiService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly eventDispatch: EventDispatchService,

    @Inject(WORKER_SSH_KEY_REPOSITORY_SYMBOL)
    private readonly repository: WorkerSshKeyRepository,
  ) {}

  public async findByWorkerId(workerId: string): Promise<WorkerSshKeyModel[]> {
    await this.workerService.findById(workerId);
    return this.repository.findByWorkerId(workerId);
  }

  public async create(
    workerId: string,
    data: CreateWorkerSshKeyDto,
  ): Promise<WorkerSshKeyModel> {
    const user = getCurrentUser();
    await this.workerService.findById(workerId);

    const publicKey = data.publicKey.trim();
    if (!OPENSSH_PUBLIC_KEY.test(publicKey)) {
      throw new BadRequestException(
        'Not an OpenSSH public key. Expected ssh-ed25519, ssh-rsa or ecdsa-sha2-*.',
      );
    }

    const existing = await this.repository.findByWorkerId(workerId);
    if (existing.some((key) => key.publicKey === publicKey)) {
      throw new BadRequestException('That key is already authorized on this worker.');
    }

    const created = await this.repository.create(
      workerId,
      data.name,
      publicKey,
      user!.userId,
    );

    await this.dispatchApply(workerId);

    return created;
  }

  public async delete(workerId: string, keyId: number): Promise<void> {
    await this.workerService.findById(workerId);

    const key = await this.repository.findById(keyId);
    if (!key || key.workerId !== workerId) {
      throw new NotFoundException();
    }

    await this.repository.delete(keyId);

    await this.dispatchApply(workerId);
  }

  private async dispatchApply(workerId: string): Promise<void> {
    const worker = await this.workerService.findById(workerId);

    if (worker.status !== ResourceStatus.ACTIVE) {
      return;
    }

    await this.eventDispatch.dispatch({
      type: EventTypeKey.WORKER_UPDATE_SSH_KEYS,
      primary: { type: 'Worker', id: workerId },
    });
  }
}
