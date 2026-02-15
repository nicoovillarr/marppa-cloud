import { PortalEntity } from '../entities/portal.entity';

export const PORTAL_REPOSITORY = Symbol('PORTAL_REPOSITORY');

export abstract class PortalRepository {
  abstract findById(id: string): Promise<PortalEntity | null>;
  abstract findByOwnerId(ownerId: string): Promise<PortalEntity[]>;
  abstract create(entity: PortalEntity): Promise<PortalEntity>;
  abstract update(entity: PortalEntity): Promise<PortalEntity>;
  abstract delete(id: string): Promise<void>;
}
