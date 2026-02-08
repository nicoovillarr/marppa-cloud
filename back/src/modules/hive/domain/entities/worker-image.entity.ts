import { PrimaryKey } from "@/shared/domain/decorators/primary-key.decorator";
import { PatchableEntity } from "@/shared/domain/entities/patchable-base.entity";

interface WorkerImageOptionalProps {
  id?: number;
  description?: string;
  osVersion?: string;
  workerStorageTypeId?: number;
}

export class WorkerImageEntity extends PatchableEntity {

  @PrimaryKey()
  public readonly id?: number;
  
  public readonly description?: string;
  public readonly osVersion?: string;
  public readonly workerStorageTypeId?: number;

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

    this.id = optionals.id ?? undefined;
    this.description = optionals.description ?? undefined;
    this.osVersion = optionals.osVersion ?? undefined;
    this.workerStorageTypeId = optionals.workerStorageTypeId ?? undefined;
  }

  toObject(): Record<string, any> {
    return {
      id: this.id ?? undefined,
      name: this.name,
      description: this.description,
      osType: this.osType,
      osVersion: this.osVersion,
      osFamily: this.osFamily,
      imageUrl: this.imageUrl,
      architecture: this.architecture,
      virtualizationType: this.virtualizationType,
      workerStorageTypeId: this.workerStorageTypeId,
    };
  }

  static fromObject(data: Record<string, any>): WorkerImageEntity {
    return new WorkerImageEntity(
      data.name,
      data.osType,
      data.osFamily,
      data.imageUrl,
      data.architecture,
      data.virtualizationType,
      {
        id: data.id,
        description: data.description,
        osVersion: data.osVersion,
        workerStorageTypeId: data.workerStorageTypeId,
      }
    );
  }
}