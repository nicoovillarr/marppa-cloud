import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoggedInGuard } from '@/auth/presentation/guards/logged-in.guard';
import { DnsApiKeyApiService } from '../../application/services/dns-api-key.api-service';
import { CreateDnsApiKeyDto } from '../dtos/create-dns-api-key.dto';
import { UpdateDnsApiKeyDto } from '../dtos/update-dns-api-key.dto';

@Controller('orbit/dns-api-keys')
@UseGuards(LoggedInGuard)
export class DnsApiKeyController {
  constructor(private readonly apiService: DnsApiKeyApiService) { }

  @Get()
  public findByOwnerId(@Query('ownerId') ownerId?: string) {
    return this.apiService.findByOwnerId(ownerId);
  }

  @Post()
  public create(@Body() dto: CreateDnsApiKeyDto) {
    return this.apiService.create(dto);
  }

  @Put(':id')
  public update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDnsApiKeyDto) {
    return this.apiService.update(id, dto);
  }

  @Delete(':id')
  public remove(@Param('id', ParseIntPipe) id: number) {
    return this.apiService.delete(id);
  }
}
