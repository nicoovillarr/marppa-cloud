export class AtomEnvVarModel {
  constructor(
    public readonly id: number,
    public readonly key: string,
    public readonly value: string,
    public readonly atomId: string,
  ) { }
}
