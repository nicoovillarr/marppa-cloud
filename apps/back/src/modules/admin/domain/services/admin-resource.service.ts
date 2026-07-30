import { Inject, Injectable } from '@nestjs/common';

import {
  ADMIN_RESOURCE_REPOSITORY_SYMBOL,
  AdminResourceRepository,
} from '../repositories/admin-resource.repository';
import { AdminResourceModel } from '../models/admin-resource.model';

@Injectable()
export class AdminResourceService {
  constructor(
    @Inject(ADMIN_RESOURCE_REPOSITORY_SYMBOL)
    private readonly repository: AdminResourceRepository,
  ) { }

  findAll(): Promise<AdminResourceModel[]> {
    return this.repository.findAll();
  }
}
