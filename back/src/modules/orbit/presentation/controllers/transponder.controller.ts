import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TransponderApiService } from '../../application/services/transponder.api-service';
import { CreateTransponderDto } from '../dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../dtos/update-transponder.dto';

@Controller('orbit/portals/portals/:portalId/transponders')
export class TransponderController {
  constructor(private readonly apiService: TransponderApiService) { }

  @Get()
  public findByPortalId(@Param('portalId') portalId: string) {
    return this.apiService.findByPortalId(portalId);
  }

  @Get(':id')
  public findOne(@Param('portalId') portalId: string, @Param('id') id: string) {
    return this.apiService.findById(portalId, id);
  }

  @Post()
  public create(
    @Param('portalId') portalId: string,
    @Body() dto: CreateTransponderDto,
  ) {
    return this.apiService.create(portalId, dto);
  }

  @Put(':id')
  public update(
    @Param('portalId') portalId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransponderDto,
  ) {
    return this.apiService.update(portalId, id, dto);
  }

  @Delete(':id')
  public remove(@Param('portalId') portalId: string, @Param('id') id: string) {
    return this.apiService.delete(portalId, id);
  }
}
