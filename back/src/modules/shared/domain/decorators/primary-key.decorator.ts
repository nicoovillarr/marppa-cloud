export const PRIMARY_KEY_METADATA = Symbol('PRIMARY_KEY_METADATA');

export function PrimaryKey() {
  return function (target: any, propertyKey: string) {
    const existing: string[] =
      Reflect.getMetadata(PRIMARY_KEY_METADATA, target) ?? [];

    Reflect.defineMetadata(
      PRIMARY_KEY_METADATA,
      [...existing, propertyKey],
      target
    );
  };
}
