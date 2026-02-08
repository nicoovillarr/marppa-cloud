import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { PortalApiService } from "../../application/services/portal.api-service";
import { CreatePortalDto } from "../dtos/create-portal.dto";
import { UpdatePortalDto } from "../dtos/update-portal.dto";

@Controller('portals')
export class PortalController {
  constructor(
    private readonly apiService: PortalApiService,
  ) { }

  @Get()
  public findByOwnerId(@Param('ownerId') ownerId?: string) {
    return this.apiService.findByOwnerId(ownerId);
  }

  @Post()
  public create(@Body() dto: CreatePortalDto) {
    return this.apiService.create(dto);
  }

  @Get(':id')
  public findOne(@Param('id') id: string) {
    return this.apiService.findById(id);
  }

  @Put(':id')
  public update(@Param('id') id: string, @Body() dto: UpdatePortalDto) {
    return this.apiService.update(id, dto);
  }

  @Delete(':id')
  public remove(@Param('id') id: string) {
    return this.apiService.delete(id);
  }
}
