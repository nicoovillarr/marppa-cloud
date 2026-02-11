import { Module } from "@nestjs/common";
import { WorkerDiskController } from "./presentation/controllers/worker-disk.controller";
import { WorkerFamilyController } from "./presentation/controllers/worker-family.controller";
import { WorkerFlavorController } from "./presentation/controllers/worker-flavor.controller";
import { WorkerImageController } from "./presentation/controllers/worker-image.controller";
import { WorkerStorageTypeController } from "./presentation/controllers/worker-storage-type.controller";
import { WorkerController } from "./presentation/controllers/worker.controller";
import { WorkerDiskApiService } from "./application/services/worker-disk.api-service";
import { WorkerDiskService } from "./domain/services/worker-disk.service";
import { WORKER_DISK_REPOSITORY_SYMBOL } from "./domain/repositories/worker-disk.repository";
import { WorkerDiskPrismaRepository } from "./infrastructure/repositories/worker-disk.prisma-repository";
import { WorkerApiService } from "./application/services/worker.api-service";
import { WorkerFamilyApiService } from "./application/services/worker-family.api-service";
import { WorkerFlavorApiService } from "./application/services/worker-flavor.api-service";
import { WorkerImageApiService } from "./application/services/worker-image.api-service";
import { WorkerStorageTypeApiService } from "./application/services/worker-storage-type.api-service";
import { WORKER_FAMILY_REPOSITORY_SYMBOL } from "./domain/repositories/worker-family.repository";
import { WORKER_FLAVOR_REPOSITORY_SYMBOL } from "./domain/repositories/worker-flavor.repository";
import { WORKER_IMAGE_REPOSITORY_SYMBOL } from "./domain/repositories/worker-image.repository";
import { WORKER_REPOSITORY_SYMBOL } from "./domain/repositories/worker.repository";
import { WorkerFamilyService } from "./domain/services/worker-family.service";
import { WorkerFlavorService } from "./domain/services/worker-flavor.service";
import { WorkerImageService } from "./domain/services/worker-image.service";
import { WorkerStorageTypeService } from "./domain/services/worker-storage-type.service";
import { WorkerService } from "./domain/services/worker.service";
import { WorkerFamilyPrismaRepository } from "./infrastructure/repositories/worker-family.prisma-repository";
import { WorkerFlavorPrismaRepository } from "./infrastructure/repositories/worker-flavor.prisma-repository";
import { WorkerImagePrismaRepository } from "./infrastructure/repositories/worker-image.prisma-repository";
import { WorkerPrismaRepository } from "./infrastructure/repositories/worker.prisma-repository";
import { WorkerStorageTypePrismaRepository } from "./infrastructure/repositories/worker-storage-type.prisma-repository";
import { WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL } from "./domain/repositories/worker-storage-type.repository";
import { SharedModule } from "@/shared/shared.module";
import { AuthModule } from "@/auth/auth.module";
import { EventModule } from "@/event/event.module";
import { MacAddressService } from "./domain/services/mac-address.service";

@Module({
  imports: [SharedModule, AuthModule, EventModule],
  controllers: [
    WorkerDiskController,
    WorkerFamilyController,
    WorkerFlavorController,
    WorkerImageController,
    WorkerStorageTypeController,
    WorkerController
  ],
  providers: [
    WorkerDiskApiService,
    WorkerDiskService,
    {
      provide: WORKER_DISK_REPOSITORY_SYMBOL,
      useClass: WorkerDiskPrismaRepository
    },

    WorkerFamilyApiService,
    WorkerFamilyService,
    {
      provide: WORKER_FAMILY_REPOSITORY_SYMBOL,
      useClass: WorkerFamilyPrismaRepository
    },

    WorkerFlavorApiService,
    WorkerFlavorService,
    {
      provide: WORKER_FLAVOR_REPOSITORY_SYMBOL,
      useClass: WorkerFlavorPrismaRepository
    },

    WorkerImageApiService,
    WorkerImageService,
    {
      provide: WORKER_IMAGE_REPOSITORY_SYMBOL,
      useClass: WorkerImagePrismaRepository
    },

    WorkerStorageTypeApiService,
    WorkerStorageTypeService,
    {
      provide: WORKER_STORAGE_TYPE_REPOSITORY_SYMBOL,
      useClass: WorkerStorageTypePrismaRepository
    },

    WorkerApiService,
    WorkerService,
    {
      provide: WORKER_REPOSITORY_SYMBOL,
      useClass: WorkerPrismaRepository
    },
    
    MacAddressService,
  ],
  exports: []
})
export class HiveModule { }