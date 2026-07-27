import { AtomEnvVarModel } from '@/nucleus/domain/models/atom-env-var.model';
import { AtomEnvVarRepository } from '@/nucleus/domain/repositories/atom-env-var.repository';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AtomEnvVarPrismaRepository implements AtomEnvVarRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findByAtomId(atomId: string): Promise<AtomEnvVarModel[]> {
    return this.prisma.atomEnvVar.findMany({
      where: { atomId },
      orderBy: { key: 'asc' },
    });
  }

  async findById(id: number): Promise<AtomEnvVarModel | null> {
    return this.prisma.atomEnvVar.findUnique({ where: { id } });
  }

  async upsert(
    atomId: string,
    key: string,
    value: string,
    userId: string,
  ): Promise<AtomEnvVarModel> {
    return this.prisma.atomEnvVar.upsert({
      where: { atomId_key: { atomId, key } },
      create: { atomId, key, value, createdBy: userId },
      update: { value, updatedBy: userId },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.atomEnvVar.delete({ where: { id } });
  }
}
