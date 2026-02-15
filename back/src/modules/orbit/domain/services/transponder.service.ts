import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSPONDER_REPOSITORY,
  TransponderRepository,
} from '../repositories/transponder.repository';
import { TransponderEntity } from '../entities/transponder.entity';
import { CreateTransponderDto } from '../../presentation/dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../../presentation/dtos/update-transponder.dto';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';

@Injectable()
export class TransponderService {
  constructor(
    @Inject(TRANSPONDER_REPOSITORY)
    private readonly repository: TransponderRepository,
  ) {}

  public findById(
    portalId: string,
    transponderId: string,
  ): Promise<TransponderEntity | null> {
    return this.repository.findById(portalId, transponderId);
  }

  public findByPortalId(portalId: string): Promise<TransponderEntity[]> {
    return this.repository.findByPortalId(portalId);
  }

  public create(
    portalId: string,
    dto: CreateTransponderDto,
  ): Promise<TransponderEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = new TransponderEntity(
      dto.path,
      dto.port,
      ResourceStatus.ACTIVE,
      user.userId,
      portalId,
      {
        mode: dto.mode,
        cacheEnabled: dto.cacheEnabled,
        allowCookies: dto.allowCookies,
        gzipEnabled: dto.gzipEnabled,
        priority: dto.priority,
      },
    );

    return this.repository.create(entity);
  }

  public async update(
    portalId: string,
    transponderId: string,
    dto: UpdateTransponderDto,
  ): Promise<TransponderEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const transponder = await this.findById(portalId, transponderId);
    if (!transponder) {
      throw new NotFoundError();
    }

    const updated = transponder.clone({
      path: dto.path,
      port: dto.port,
      mode: dto.mode,
      cacheEnabled: dto.cacheEnabled,
      allowCookies: dto.allowCookies,
      gzipEnabled: dto.gzipEnabled,
      priority: dto.priority,
      updatedBy: user.userId,
    });

    return this.repository.update(updated);
  }

  public delete(portalId: string, transponderId: string): Promise<void> {
    return this.repository.delete(portalId, transponderId);
  }
}
