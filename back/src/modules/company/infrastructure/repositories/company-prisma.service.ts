import { Inject, Injectable } from "@nestjs/common";
import { CompanyRepository } from "../../domain/repositories/company.repository";
import { CompanyEntity } from "../../domain/entities/company.entity";
import { CompanyPrismaMapper } from "../mappers/company-prisma.mapper";
import { PrismaService } from "@/shared/infrastructure/services/prisma.service";

@Injectable()
export class CompanyPrismaService implements CompanyRepository {
  constructor(
    @Inject()
    private readonly prisma: PrismaService
  ) { }

  async create(data: CompanyEntity): Promise<CompanyEntity> {
    const company = await this.prisma.company.create({
      data: {
        name: data.name,
      },
    });

    return CompanyPrismaMapper.toEntity(company);
  }

  async update(id: string, data: CompanyEntity): Promise<CompanyEntity> {
    const company = await this.prisma.company.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        alias: data.alias ?? null,
        description: data.description ?? null,
        parentCompanyId: data.parentCompanyId ?? null,
      },
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
}