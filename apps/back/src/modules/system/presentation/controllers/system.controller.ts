import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LoggedInGuard } from '@/auth/presentation/guards/logged-in.guard';
import {
  SystemApiService,
  SystemResetAvailability,
} from '../../application/services/system.api-service';
import { SystemResetDto } from '../dtos/system-reset.dto';

@Controller('system')
@UseGuards(LoggedInGuard)
export class SystemController {
  constructor(private readonly apiService: SystemApiService) {}

  @Get('reset/availability')
  public async availability(): Promise<SystemResetAvailability> {
    return this.apiService.availability();
  }

  @Post('reset')
  public async reset(
    @Body() data: SystemResetDto,
  ): Promise<{ eventId: number }> {
    return this.apiService.reset(data.hard === true, data.confirmPassword);
  }
}
