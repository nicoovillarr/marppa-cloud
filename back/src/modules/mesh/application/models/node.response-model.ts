import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { Expose } from "class-transformer";

export class NodeResponseModel {
  @Expose()
  public readonly id: string;

  @Expose()
  public readonly ipAddress: string;

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
  public readonly zoneId: string;

  @Expose()
  public readonly workerId: string | null;

  @Expose()
  public readonly atomId: string | null;
}