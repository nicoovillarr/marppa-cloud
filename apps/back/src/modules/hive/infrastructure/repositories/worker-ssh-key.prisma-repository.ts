import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { WorkerSshKeyRepository } from '@/hive/domain/repositories/worker-ssh-key.repository';
import { WorkerSshKeyModel } from '@/hive/domain/models/worker-ssh-key.model';

@Injectable()
export class WorkerSshKeyPrismaRepository implements WorkerSshKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkerId(workerId: string): Promise<WorkerSshKeyModel[]> {
    return this.prisma.workerSshKey.findMany({
      where: { workerId },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number): Promise<WorkerSshKeyModel | null> {
    return this.prisma.workerSshKey.findUnique({ where: { id } });
  }

  async create(
    workerId: string,
    name: string,
    publicKey: string,
    createdBy: string,
  ): Promise<WorkerSshKeyModel> {
    return this.prisma.workerSshKey.create({
      data: { workerId, name, publicKey, createdBy },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.workerSshKey.delete({ where: { id } });
  }
}
