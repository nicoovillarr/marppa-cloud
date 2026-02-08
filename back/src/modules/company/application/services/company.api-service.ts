import { Injectable } from "@nestjs/common";
import { CompanyEntity } from "../../domain/entities/company.entity";
import { CompanyService } from "../../domain/services/company.service";
import { CreateCompanyDto } from "../../presentation/dtos/create-company.dto";
import { UpdateCompanyDto } from "../../presentation/dtos/update-company.dto";

@Injectable()
export class CompanyApiService {
  constructor(
    private readonly companyService: CompanyService
  ) { }

  public async create(data: CreateCompanyDto): Promise<CompanyEntity> {
    return this.companyService.create(data);
  }

  public async update(id: string, data: UpdateCompanyDto): Promise<CompanyEntity> {
    return this.companyService.update(id, data);
  }

  public async delete(id: string): Promise<void> {
    return this.companyService.delete(id);
  }

  public async findById(id: string): Promise<CompanyEntity | null> {
    return this.companyService.findById(id);
  }

  public async findAll(): Promise<CompanyEntity[]> {
    return this.companyService.findAll();
  }
}