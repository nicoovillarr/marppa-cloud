import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { Expose } from "class-transformer";

export class FiberResponseModel {
  @Expose()
  public readonly id: string;

  @Expose()
  public readonly protocol: string;

  @Expose()
  public readonly hostPort: number;

  @Expose()
  public readonly targetPort: number;

  @Expose()
  public readonly status: ResourceStatus;

  @Expose()
  public readonly createdAt: Date;

  @Expose()
  public readonly createdBy: string;

  @Expose()
  public readonly updatedAt: Date | null;

  @Expose()
  public readonly updatedBy: string | null;

  @Expose()
  public readonly nodeId: string;
}
