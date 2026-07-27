import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AtomService } from '@/nucleus/domain/services/atom.service';
import {
  ATOM_ENV_VAR_REPOSITORY_SYMBOL,
  AtomEnvVarRepository,
} from '@/nucleus/domain/repositories/atom-env-var.repository';
import { AtomEnvVarModel } from '@/nucleus/domain/models/atom-env-var.model';
import { CreateAtomEnvVarDto } from '@/nucleus/presentation/dtos/create-atom-env-var.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

/**
 * Env vars are read by the ATOM_START processor when it builds the container,
 * so they can only be edited while the atom is stopped — otherwise the running
 * container would silently disagree with what the API reports.
 */
@Injectable()
export class AtomEnvVarApiService {
  constructor(
    private readonly atomService: AtomService,

    @Inject(ATOM_ENV_VAR_REPOSITORY_SYMBOL)
    private readonly repository: AtomEnvVarRepository,
  ) { }

  public async findByAtomId(atomId: string): Promise<AtomEnvVarModel[]> {
    await this.atomService.findById(atomId);
    return this.repository.findByAtomId(atomId);
  }

  public async upsert(
    atomId: string,
    data: CreateAtomEnvVarDto,
  ): Promise<AtomEnvVarModel> {
    const user = getCurrentUser();
    await this.assertEditable(atomId);

    return this.repository.upsert(atomId, data.key, data.value, user!.userId);
  }

  public async delete(atomId: string, id: number): Promise<void> {
    await this.assertEditable(atomId);

    const envVar = await this.repository.findById(id);
    if (!envVar || envVar.atomId !== atomId) {
      throw new NotFoundException();
    }

    await this.repository.delete(id);
  }

  private async assertEditable(atomId: string): Promise<void> {
    const atom = await this.atomService.findById(atomId);
    if (atom.status === ResourceStatus.QUEUED) {
      return;
    }

    this.atomService.assertStatus(atom, ResourceStatus.INACTIVE);
  }
}
