import { BaseEntity } from './base.entity';

export abstract class PatchableEntity extends BaseEntity {
  protected mergePatch(
    current: Record<string, any>,
    patch: Partial<this>,
  ): Record<string, any> {
    const result = { ...current };

    for (const key in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        const value = (patch as any)[key];
        if (value !== undefined) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  clone(updated: Partial<this>): this {
    const base = this.toObject();
    const merged = this.mergePatch(base, updated);

    return (this.constructor as any).fromObject(merged);
  }
}
