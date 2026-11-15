export const formatPortalType = (type: string): string =>
  type.length === 0 ? type : type[0].toUpperCase() + type.slice(1).toLowerCase();
