import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { EventModule } from '@/event/event.module';
import { MeshModule } from '@/mesh/mesh.module';
import { CompanyModule } from '@/company/company.module';
import { AtomController } from './presentation/controllers/atom.controller';
import { AtomImageController } from './presentation/controllers/atom-image.controller';
import { AtomSizeController } from './presentation/controllers/atom-size.controller';
import { AtomVolumeController } from './presentation/controllers/atom-volume.controller';
import { AtomApiService } from './application/services/atom.api-service';
import { AtomEnvVarApiService } from './application/services/atom-env-var.api-service';
import { AtomImageApiService } from './application/services/atom-image.api-service';
import { AtomSizeApiService } from './application/services/atom-size.api-service';
import { AtomService } from './domain/services/atom.service';
import { AtomImageService } from './domain/services/atom-image.service';
import { AtomSizeService } from './domain/services/atom-size.service';
import { ATOM_REPOSITORY_SYMBOL } from './domain/repositories/atom.repository';
import { ATOM_IMAGE_REPOSITORY_SYMBOL } from './domain/repositories/atom-image.repository';
import { ATOM_ENV_VAR_REPOSITORY_SYMBOL } from './domain/repositories/atom-env-var.repository';
import { AtomPrismaRepository } from './infrastructure/repositories/atom.prisma-repository';
import { AtomImagePrismaRepository } from './infrastructure/repositories/atom-image.prisma-repository';
import { AtomSizePrismaRepository } from './infrastructure/repositories/atom-size.prisma-repository';
import { ATOM_SIZE_REPOSITORY_SYMBOL } from './domain/repositories/atom-size.repository';
import { AtomEnvVarPrismaRepository } from './infrastructure/repositories/atom-env-var.prisma-repository';
import { AtomVolumeApiService } from './application/services/atom-volume.api-service';
import { AtomVolumeService } from './domain/services/atom-volume.service';
import { ATOM_VOLUME_REPOSITORY_SYMBOL } from './domain/repositories/atom-volume.repository';
import { AtomVolumePrismaRepository } from './infrastructure/repositories/atom-volume.prisma-repository';

@Module({
  imports: [SharedModule, AuthModule, EventModule, MeshModule, CompanyModule],
  controllers: [
    AtomController,
    AtomImageController,
    AtomSizeController,
    AtomVolumeController,
  ],
  providers: [
    AtomImageApiService,
    AtomImageService,
    {
      provide: ATOM_IMAGE_REPOSITORY_SYMBOL,
      useClass: AtomImagePrismaRepository,
    },

    AtomSizeApiService,
    AtomSizeService,
    {
      provide: ATOM_SIZE_REPOSITORY_SYMBOL,
      useClass: AtomSizePrismaRepository,
    },

    AtomApiService,
    AtomService,
    {
      provide: ATOM_REPOSITORY_SYMBOL,
      useClass: AtomPrismaRepository,
    },

    AtomEnvVarApiService,
    {
      provide: ATOM_ENV_VAR_REPOSITORY_SYMBOL,
      useClass: AtomEnvVarPrismaRepository,
    },

    AtomVolumeApiService,
    AtomVolumeService,
    {
      provide: ATOM_VOLUME_REPOSITORY_SYMBOL,
      useClass: AtomVolumePrismaRepository,
    },
  ],
  exports: [AtomService],
})
export class NucleusModule { }
