export function mergeDto<T extends object>(
    Target: new () => T,
    ...sources: Partial<T>[]
): T {
    return Object.assign(new Target(), ...sources);
}
