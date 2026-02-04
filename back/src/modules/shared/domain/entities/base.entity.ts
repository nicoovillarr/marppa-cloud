export abstract class BaseEntity {
  abstract toObject(): Record<string, any>;
}
