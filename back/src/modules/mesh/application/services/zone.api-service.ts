import { Injectable } from "@nestjs/common";
import { ZoneService } from "../../domain/services/zone.service";
import { plainToInstance } from "class-transformer";
import { CreateZoneDto } from "../../presentation/dtos/create-zone.dto";
import { UpdateZoneDto } from "../../presentation/dtos/update-zone.dto";
import { ZoneResponseModel } from "../models/zone.response-model";
import { NetmaskService } from "../../domain/services/netmask.service";

@Injectable()
export class ZoneApiService {
  constructor(
    private readonly zoneService: ZoneService,
    private readonly netmaskService: NetmaskService,
  ) { }

  public async findById(id: string): Promise<ZoneResponseModel> {
    const entity = await this.zoneService.findById(id);
    return plainToInstance(ZoneResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async findByOwnerId(ownerId?: string): Promise<ZoneResponseModel[]> {
    const entities = await this.zoneService.findByOwnerId(ownerId);
    return plainToInstance(ZoneResponseModel, entities, { excludeExtraneousValues: true });
  }

  public async create(data: CreateZoneDto): Promise<ZoneResponseModel> {
    const lastZone = await this.zoneService.findLastZone();

    const { cidr, gateway } = this.netmaskService.getNextCidr(lastZone?.zone.cidr, 8);

    const entity = await this.zoneService.create(data, cidr, gateway);

    return plainToInstance(ZoneResponseModel, entity, { excludeExtraneousValues: true });
  }

  public async update(id: string, data: UpdateZoneDto): Promise<ZoneResponseModel> {
    const entity = await this.zoneService.update(id, data);
    return plainToInstance(ZoneResponseModel, entity, { excludeExtraneousValues: true });
  }

  public delete(id: string): Promise<void> {
    return this.zoneService.delete(id);
  }
}