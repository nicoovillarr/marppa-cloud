import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { CompanyApiService } from "../../application/services/company-api.service";
import { CreateCompanyDto } from "../dtos/create-company.dto";
import { CompanyEntity } from "../../domain/entities/company.entity";
import { UpdateCompanyDto } from "../dtos/update-company.dto";
import { LoggedInGuard } from "@/auth/presentation/guards/logged-in.guard";

@Controller('company')
@UseGuards(LoggedInGuard)
export class CompanyController {
  constructor(
    private readonly companyApiService: CompanyApiService
  ) { }

  @Post()
  public async create(@Body() data: CreateCompanyDto): Promise<CompanyEntity> {
    return this.companyApiService.create(data);
  }

  @Put(':id')
  public async update(@Param('id') id: string, @Body() data: UpdateCompanyDto): Promise<CompanyEntity> {
    return this.companyApiService.update(id, data);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    return this.companyApiService.delete(id);
  }

  @Get(':id')
  public async findById(@Param('id') id: string): Promise<CompanyEntity | null> {
    return this.companyApiService.findById(id);
  }

  @Get()
  public async findAll(): Promise<CompanyEntity[]> {
    return this.companyApiService.findAll();
  }
}