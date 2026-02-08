import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { Expose } from "class-transformer";

export class ZoneResponseModel {
  @Expose()
  public id: string;

  @Expose()
  public name: string;

  @Expose()
  public description: string;

  @Expose()
  public status: ResourceStatus;

  @Expose()
  public cidr: string;

  @Expose()
  public gateway: string;

  @Expose()
  public createdAt: Date;

  @Expose()
  public createdBy: string;

  @Expose()
  public updatedAt: Date | null;

  @Expose()
  public updatedBy: string | null;

  @Expose()
  public ownerId: string;
}