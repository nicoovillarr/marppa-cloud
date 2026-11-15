import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { DnsApiKeyRepository } from '../../domain/repositories/dns-api-key.repository';
import { DnsApiKeyEntity } from '../../domain/entities/dns-api-key.entity';
import { DnsApiKeyWithUsageModel } from '../../domain/models/dns-api-key-with-usage.model';
import { DnsApiKeyPrismaMapper } from '../mappers/dns-api-key.prisma-mapper';

const LIVE_PORTALS = { status: { not: ResourceStatus.DELETED } };

@Injectable()
export class DnsApiKeyPrismaRepository implements DnsApiKeyRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: number): Promise<DnsApiKeyEntity | null> {
    const key = await this.prisma.dnsApiKey.findUnique({ where: { id } });
    return key == null ? null : DnsApiKeyPrismaMapper.toEntity(key);
  }

  async findByOwnerIdsWithUsage(ownerIds: string[]): Promise<DnsApiKeyWithUsageModel[]> {
    const list = await this.prisma.dnsApiKey.findMany({
      where: { ownerId: { in: ownerIds } },
      include: { _count: { select: { portals: { where: LIVE_PORTALS } } } },
      orderBy: { name: 'asc' },
    });

    return list.map(
      (key) =>
        new DnsApiKeyWithUsageModel(
          DnsApiKeyPrismaMapper.toEntity(key),
          key._count.portals,
        ),
    );
  }

  async findByOwnerIdAndName(ownerId: string, name: string): Promise<DnsApiKeyEntity | null> {
    const key = await this.prisma.dnsApiKey.findUnique({
      where: { ownerId_name: { ownerId, name } },
    });
    return key == null ? null : DnsApiKeyPrismaMapper.toEntity(key);
  }

  async countLivePortals(id: number): Promise<number> {
    return this.prisma.portal.count({
      where: { dnsApiKeyId: id, ...LIVE_PORTALS },
    });
  }

  async create(entity: DnsApiKeyEntity): Promise<DnsApiKeyEntity> {
    const key = await this.prisma.dnsApiKey.create({
      data: PrismaMapper.toCreate(entity),
    });
    return DnsApiKeyPrismaMapper.toEntity(key);
  }

  async update(entity: DnsApiKeyEntity): Promise<DnsApiKeyEntity> {
    const key = await this.prisma.dnsApiKey.update({
      where: { id: entity.id },
      data: PrismaMapper.toUpdate(entity),
    });
    return DnsApiKeyPrismaMapper.toEntity(key);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.dnsApiKey.delete({ where: { id } });
  }
}
