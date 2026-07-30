import { Inject, Injectable } from '@nestjs/common';

import {
  ADMIN_RESOURCE_REPOSITORY_SYMBOL,
  AdminResourceFilter,
  AdminResourcePage,
  AdminResourceRepository,
} from '../repositories/admin-resource.repository';

@Injectable()
export class AdminResourceService {
  constructor(
    @Inject(ADMIN_RESOURCE_REPOSITORY_SYMBOL)
    private readonly repository: AdminResourceRepository,
  ) { }

  findPage(
    skip: number,
    take: number,
    filter: AdminResourceFilter,
  ): Promise<AdminResourcePage> {
    return this.repository.findPage(skip, take, filter);
  }
}
