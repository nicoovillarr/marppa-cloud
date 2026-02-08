import { PRIMARY_KEY_METADATA } from "@/shared/domain/decorators/primary-key.decorator";
import { BaseEntity } from "@/shared/domain/entities/base.entity";

export class PrismaMapper {
  static toCreate(value: BaseEntity) {
    const deepCopy = JSON.parse(JSON.stringify(value));
    const primaryKeys = this.getPrimaryKeys(value);

    if (deepCopy != null) {
      for (const key in deepCopy) {
        if (primaryKeys.includes(key)) {
          deepCopy[key] = undefined;
          continue;
        }

        if (key.toLowerCase().endsWith('id')) {
          if (deepCopy[key] == null) {
            deepCopy[key] = undefined;
            continue;
          }

          const foreign = key.substring(0, key.length - 2);
          deepCopy[foreign] = {
            connect: {
              id: deepCopy[key],
            }
          }

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
        Object.getPrototypeOf(entity)
      ) ?? []
    );
  }
}