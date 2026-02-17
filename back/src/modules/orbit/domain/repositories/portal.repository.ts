import { PortalEntity } from '../entities/portal.entity';
import { PortalWithTranspondersWithNodeModel } from '../models/portal-with-transponders-with-node.model';

export const PORTAL_REPOSITORY = Symbol('PORTAL_REPOSITORY');

export abstract class PortalRepository {
  abstract findById(id: string): Promise<PortalEntity | null>;
  abstract findByIdWithTranspondersWithNode(id: string): Promise<PortalWithTranspondersWithNodeModel | null>;
  abstract findByOwnerId(ownerId: string): Promise<PortalEntity[]>;
  abstract create(entity: PortalEntity): Promise<PortalEntity>;
  abstract update(entity: PortalEntity): Promise<PortalEntity>;
  abstract delete(id: string): Promise<void>;
}
