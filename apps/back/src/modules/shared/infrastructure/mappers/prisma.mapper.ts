import { PRIMARY_KEY_METADATA } from '@/shared/domain/decorators/primary-key.decorator';
import { BaseEntity } from '@/shared/domain/entities/base.entity';

type NullRelationStrategy = 'skip' | 'disconnect';

export class PrismaMapper {
  static toCreate(value: BaseEntity) {
    return this.toPrismaData(value, 'skip');
  }

  static toUpdate(value: BaseEntity) {
    return this.toPrismaData(value, 'disconnect');
  }

  private static toPrismaData(
    value: BaseEntity,
    nullRelations: NullRelationStrategy,
  ) {
    const deepCopy = JSON.parse(JSON.stringify(value));
    const primaryKeys = this.getPrimaryKeys(value);

    if (deepCopy != null) {
      for (const key in deepCopy) {
        if (primaryKeys.includes(key)) {
          deepCopy[key] = undefined;
          continue;
        }

        if (key.toLowerCase().endsWith('id')) {
          if (deepCopy[key] == null && nullRelations === 'skip') {
            deepCopy[key] = undefined;
            continue;
          }

          const foreign = key.substring(0, key.length - 2);
          deepCopy[foreign] =
            deepCopy[key] == null
              ? { disconnect: true }
              : { connect: { id: deepCopy[key] } };

          delete deepCopy[key];
        }
      }
    }

    return deepCopy;
  }

  private static getPrimaryKeys(entity: object): string[] {
    return (
      Reflect.getMetadata(
        PRIMARY_KEY_METADATA,
        Object.getPrototypeOf(entity),
      ) ?? []
    );
  }
}
