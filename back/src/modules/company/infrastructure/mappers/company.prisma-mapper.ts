import { Company } from "@prisma/client";
import { CompanyEntity } from "../../domain/entities/company.entity";

export class CompanyPrismaMapper {
  static toEntity(raw: Company): CompanyEntity {
    return new CompanyEntity(
      raw.name,
      {
        id: raw.id,
        alias: raw.alias ?? undefined,
        description: raw.description ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        parentCompanyId: raw.parentCompanyId ?? undefined,
      }
    );
  }
}