import { Inject, Injectable } from "@nestjs/common";
import { PORTAL_REPOSITORY, PortalRepository } from "../repositories/portal.repository";
import { CreatePortalDto } from "../../presentation/dtos/create-portal.dto";
import { PortalEntity } from "../entities/portal.entity";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { getCurrentUser } from "@/auth/infrastructure/als/session.context";
import { UnauthorizedError } from "@/shared/domain/errors/unauthorized.error";
import { UpdatePortalDto } from "../../presentation/dtos/update-portal.dto";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";

@Injectable()
export class PortalService {
  constructor(
    @Inject(PORTAL_REPOSITORY)
    private readonly portalRepository: PortalRepository,
  ) { }

  public async findById(id: string): Promise<PortalEntity | null> {
    return this.portalRepository.findById(id);
  }

  public async findByOwnerId(ownerId: string): Promise<PortalEntity[]> {
    return this.portalRepository.findByOwnerId(ownerId);
  }

  public create(data: CreatePortalDto): Promise<PortalEntity> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    const portal = new PortalEntity(
      data.name,
      data.address,
      data.type,
      data.apiKey,
      ResourceStatus.ACTIVE,
      user.userId,
      user.companyId,
      {
        description: data.description,
        listenHttp: data.listenHttp,
        listenHttps: data.listenHttps,
        sslCertificate: data.sslCertificate,
        sslKey: data.sslKey,
        enableCompression: data.enableCompression,
        cacheEnabled: data.cacheEnabled,
        corsEnabled: data.corsEnabled,
        defaultServer: data.defaultServer,
        zoneId: data.zoneId,
      }
    );

    return this.save(portal);
  }

  public async update(id: string, data: UpdatePortalDto): Promise<PortalEntity> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    const portal = await this.portalRepository.findById(id);
    if (portal == null) {
      throw new NotFoundError();
    }

    const entity = portal.clone({
      name: data.name,
      description: data.description,
      listenHttp: data.listenHttp,
      listenHttps: data.listenHttps,
      sslCertificate: data.sslCertificate,
      sslKey: data.sslKey,
      enableCompression: data.enableCompression,
      cacheEnabled: data.cacheEnabled,
      corsEnabled: data.corsEnabled,
      defaultServer: data.defaultServer,
      zoneId: data.zoneId,
    });

    return this.save(entity);
  }

  public async delete(id: string): Promise<void> {
    return this.portalRepository.delete(id);
  }

  private save(entity: PortalEntity): Promise<PortalEntity> {
    if (entity.id == null) {
      return this.portalRepository.create(entity);
    }

    return this.portalRepository.update(entity);
  }
}