export abstract class BaseResponseDto {
  constructor(props?: Record<string, any>) {
    if (props) Object.assign(this, props);
  }

  toJSON() {
    const plain: any = {};

    for (const [key, value] of Object.entries(this)) {
      if (value && typeof value === 'object') {
        if ('toObject' in value && typeof value.toObject === 'function') {
          plain[key] = value.toObject();
        } else if (Array.isArray(value)) {
          plain[key] = value.map((v) =>
            v && 'toObject' in v ? v.toObject() : v,
          );
        } else {
          plain[key] = value;
        }
      } else {
        plain[key] = value;
      }
    }

    return plain;
  }
}
