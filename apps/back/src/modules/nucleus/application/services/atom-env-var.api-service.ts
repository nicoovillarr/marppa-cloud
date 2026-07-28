import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AtomService } from '@/nucleus/domain/services/atom.service';
import { AtomImageService } from '@/nucleus/domain/services/atom-image.service';
import {
  ATOM_ENV_VAR_REPOSITORY_SYMBOL,
  AtomEnvVarRepository,
} from '@/nucleus/domain/repositories/atom-env-var.repository';
import { AtomEnvVarModel } from '@/nucleus/domain/models/atom-env-var.model';
import { AtomEntity } from '@/nucleus/domain/entities/atom.entity';
import { CreateAtomEnvVarDto } from '@/nucleus/presentation/dtos/create-atom-env-var.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';

/**
 * Env vars are read by the ATOM_START processor when it builds the container,
 * so they can only be edited while the atom is stopped — otherwise the running
 * container would silently disagree with what the API reports.
 */
@Injectable()
export class AtomEnvVarApiService {
  constructor(
    private readonly atomService: AtomService,
    private readonly atomImageService: AtomImageService,

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
    const atom = await this.assertEditable(atomId);

    if (!data.value.trim()) {
      await this.assertNotRequired(atom, data.key);
    }

    return this.repository.upsert(atomId, data.key, data.value, user!.userId);
  }

  public async delete(atomId: string, id: number): Promise<void> {
    const atom = await this.assertEditable(atomId);

    const envVar = await this.repository.findById(id);
    if (!envVar || envVar.atomId !== atomId) {
      throw new NotFoundException();
    }

    await this.assertNotRequired(atom, envVar.key);

    await this.repository.delete(id);
  }

  private async assertNotRequired(atom: AtomEntity, key: string): Promise<void> {
    const image = await this.atomImageService.findById(atom.imageId);
    if (image.requiredEnvVars.includes(key)) {
      throw new BadRequestError(
        `${key} is required by image "${image.name}" and cannot be emptied or removed.`,
      );
    }
  }

  private async assertEditable(atomId: string): Promise<AtomEntity> {
    const atom = await this.atomService.findById(atomId);
    if (atom.status === ResourceStatus.QUEUED) {
      return atom;
    }

    this.atomService.assertStatus(atom, ResourceStatus.INACTIVE);
    return atom;
  }
}
