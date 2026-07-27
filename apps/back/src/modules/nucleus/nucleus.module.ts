import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { AuthModule } from '@/auth/auth.module';
import { EventModule } from '@/event/event.module';
import { MeshModule } from '@/mesh/mesh.module';
import { AtomController } from './presentation/controllers/atom.controller';
import { AtomImageController } from './presentation/controllers/atom-image.controller';
import { AtomApiService } from './application/services/atom.api-service';
import { AtomEnvVarApiService } from './application/services/atom-env-var.api-service';
import { AtomImageApiService } from './application/services/atom-image.api-service';
import { AtomService } from './domain/services/atom.service';
import { AtomImageService } from './domain/services/atom-image.service';
import { ATOM_REPOSITORY_SYMBOL } from './domain/repositories/atom.repository';
import { ATOM_IMAGE_REPOSITORY_SYMBOL } from './domain/repositories/atom-image.repository';
import { ATOM_ENV_VAR_REPOSITORY_SYMBOL } from './domain/repositories/atom-env-var.repository';
import { AtomPrismaRepository } from './infrastructure/repositories/atom.prisma-repository';
import { AtomImagePrismaRepository } from './infrastructure/repositories/atom-image.prisma-repository';
import { AtomEnvVarPrismaRepository } from './infrastructure/repositories/atom-env-var.prisma-repository';

@Module({
  imports: [SharedModule, AuthModule, EventModule, MeshModule],
  controllers: [AtomController, AtomImageController],
  providers: [
    AtomImageApiService,
    AtomImageService,
    {
      provide: ATOM_IMAGE_REPOSITORY_SYMBOL,
      useClass: AtomImagePrismaRepository,
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
  ],
  exports: [AtomService],
})
export class NucleusModule { }
