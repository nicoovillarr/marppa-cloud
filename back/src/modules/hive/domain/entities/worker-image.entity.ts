import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerImageOptionalProps {
  id?: number;
  description?: string;
  osVersion?: string;
  workerStorageTypeId?: string;
}

export class WorkerImageEntity extends PatchableEntity {
  public readonly id: number | null;
  public readonly description: string | null;
  public readonly osVersion: string | null;
  public readonly workerStorageTypeId: string | null;

  constructor(
    public readonly name: string,
    public readonly osType: string,
    public readonly osFamily: string,
    public readonly imageUrl: string,
    public readonly architecture: string,
    public readonly virtualizationType: string,
    optionals: WorkerImageOptionalProps = {},
  ) {
    super();

    this.id = optionals.id ?? null;
    this.description = optionals.description ?? null;
    this.osVersion = optionals.osVersion ?? null;
    this.workerStorageTypeId = optionals.workerStorageTypeId ?? null;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      osType: this.osType,
      osVersion: this.osVersion,
      osFamily: this.osFamily,
      imageUrl: this.imageUrl,
      architecture: this.architecture,
      virtualizationType: this.virtualizationType,
      description: this.description,
      workerStorageTypeId: this.workerStorageTypeId,
    };
  }
}