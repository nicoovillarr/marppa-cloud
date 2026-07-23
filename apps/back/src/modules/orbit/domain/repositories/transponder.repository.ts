import { TransponderEntity } from '../entities/transponder.entity';

export const TRANSPONDER_REPOSITORY = Symbol('TRANSPONDER_REPOSITORY_SYMBOL');

export abstract class TransponderRepository {
  abstract findById(
    portalId: string,
    transponderId: string,
  ): Promise<TransponderEntity | null>;
  abstract findByPortalId(portalId: string): Promise<TransponderEntity[]>;
  abstract create(entity: TransponderEntity): Promise<TransponderEntity>;
  abstract update(entity: TransponderEntity): Promise<TransponderEntity>;
  abstract delete(portalId: string, transponderId: string): Promise<void>;
}
