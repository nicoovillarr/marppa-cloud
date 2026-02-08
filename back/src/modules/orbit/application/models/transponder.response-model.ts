import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";

import { TransponderMode } from "../../domain/enum/transponder-mode.enum";
import { Expose } from "class-transformer";

export class TransponderResponseModel {
  @Expose()
  id: string;

  @Expose()
  path: string;

  @Expose()
  port: number;

  @Expose()
  status: ResourceStatus;

  @Expose()
  mode: TransponderMode;

  @Expose()
  cacheEnabled: boolean;

  @Expose()
  allowCookies: boolean;

  @Expose()
  gzipEnabled: boolean;

  @Expose()
  priority: number;

  @Expose()
  createdAt: Date;

  @Expose()
  createdBy: string;

  @Expose()
  updatedAt: Date;

  @Expose()
  updatedBy: string;

  @Expose()
  portalId: string;

  @Expose()
  nodeId: string;
}