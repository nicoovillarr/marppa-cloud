import { Inject, Injectable } from '@nestjs/common';
import { CompanyRepository } from '../../domain/repositories/company.repository';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { CompanyPrismaMapper } from '../mappers/company.prisma-mapper';
import { PrismaService } from '@/shared/infrastructure/services/prisma.service';
import { PrismaMapper } from '@/shared/infrastructure/mappers/prisma.mapper';

@Injectable()
export class CompanyPrismaRepository implements CompanyRepository {
  constructor(
    @Inject()
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<CompanyEntity | null> {
    const company = await this.prisma.company.findUnique({
      where: {
        id,
      },
    });

    if (company == null) {
      return null;
    }

    return CompanyPrismaMapper.toEntity(company);
  }

  async findAll(): Promise<CompanyEntity[]> {
    const companies = await this.prisma.company.findMany();
    return companies.map(CompanyPrismaMapper.toEntity);
  }

  async create(entity: CompanyEntity): Promise<CompanyEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const company = await this.prisma.company.create({
      data: sanitized,
    });

    return CompanyPrismaMapper.toEntity(company);
  }

  async update(id: string, entity: CompanyEntity): Promise<CompanyEntity> {
    const sanitized = PrismaMapper.toCreate(entity);

    const company = await this.prisma.company.update({
      where: {
        id,
      },
      data: sanitized,
    });

    return CompanyPrismaMapper.toEntity(company);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.company.delete({
      where: {
        id,
      },
    });
  }
}
