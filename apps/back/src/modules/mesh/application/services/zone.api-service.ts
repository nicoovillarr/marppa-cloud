import { Injectable } from '@nestjs/common';
import { ZoneService } from '../../domain/services/zone.service';
import { plainToInstance } from 'class-transformer';
import { CreateZoneDto } from '../../presentation/dtos/create-zone.dto';
import { UpdateZoneDto } from '../../presentation/dtos/update-zone.dto';
import { ZoneResponseModel } from '../models/zone.response-model';
import { NetmaskService } from '../../domain/services/netmask.service';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { ZoneWithNodesAndFibersResponseModel } from '../models/zone-with-nodes-and-fibers.response-model';
import { ZoneWithNodesResponseModel } from '../models/zone-with-nodes.response.model';
import { mergeDto } from '@/shared/application/utils/merge-dto.utils';
import { NodeResponseModel } from '../models/node.response-model';
import { FiberResponseModel } from '../models/fiber.response-model';
import { NodeWithFibersResponseModel } from '../models/node-with-fibers.response-model';

@Injectable()
export class ZoneApiService {
  constructor(
    private readonly zoneService: ZoneService,
    private readonly netmaskService: NetmaskService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  public async findById(id: string): Promise<ZoneWithNodesAndFibersResponseModel> {
    const data = await this.zoneService.findByIdFull(id);

    const zone = plainToInstance(ZoneResponseModel, data.zone, { excludeExtraneousValues: true });
    const nodes = data.nodes.map(data => {
      const node = plainToInstance(NodeResponseModel, data.node, { excludeExtraneousValues: true });
      const fibers = data.fibers.map(fiber => plainToInstance(FiberResponseModel, fiber, { excludeExtraneousValues: true }));

      return mergeDto(NodeWithFibersResponseModel, node, { fibers });
    });

    return mergeDto(ZoneWithNodesAndFibersResponseModel, zone, { nodes });
  }

  public async findByOwnerId(ownerId?: string): Promise<ZoneWithNodesResponseModel[]> {
    const list = await this.zoneService.findByOwnerId(ownerId);
    return list.map(data => {
      const zone = plainToInstance(ZoneResponseModel, data.zone, { excludeExtraneousValues: true });
      const nodes = data.nodes.map(node => plainToInstance(NodeResponseModel, node, { excludeExtraneousValues: true }));

      return mergeDto(ZoneWithNodesResponseModel, zone, { nodes })
    });
  }

  public async create(data: CreateZoneDto): Promise<ZoneResponseModel> {
    const existing = await this.zoneService.findAllActive();

    let cidr: string;
    let gateway: string;

    if (data.cidr) {
      ({ cidr, gateway } = this.netmaskService.parseCidr(data.cidr));

      const conflict = existing.find((z) =>
        this.netmaskService.overlaps(z.cidr, cidr),
      );
      if (conflict) {
        throw new Error(
          `CIDR ${cidr} overlaps existing zone ${conflict.name} (${conflict.cidr})`,
        );
      }
    } else {
      const lastZone = await this.zoneService.findLastZone();
      let candidate = this.netmaskService.getNextCidr(lastZone?.zone.cidr, 8);

      // Walk forward past any manually-assigned blocks.
      for (
        let i = 0;
        i < 1024 &&
        existing.some((z) => this.netmaskService.overlaps(z.cidr, candidate.cidr));
        i++
      ) {
        candidate = this.netmaskService.getNextCidr(candidate.cidr, 8);
      }

      if (existing.some((z) => this.netmaskService.overlaps(z.cidr, candidate.cidr))) {
        throw new Error('No free CIDR block found for a new zone');
      }

      ({ cidr, gateway } = candidate);
    }

    const entity = await this.zoneService.create(data, cidr, gateway);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ZONE_CREATE,
      primary: { type: 'Zone', id: entity.id!.toString() },
    });

    return plainToInstance(ZoneResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async update(
    id: string,
    data: UpdateZoneDto,
  ): Promise<ZoneResponseModel> {
    const entity = await this.zoneService.update(id, data);
    return plainToInstance(ZoneResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.zoneService.delete(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ZONE_DELETE,
      primary: { type: 'Zone', id },
    });
  }

  public async stop(id: string): Promise<void> {
    await this.zoneService.stop(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ZONE_STOP,
      primary: { type: 'Zone', id },
    });
  }

  public async start(id: string): Promise<void> {
    await this.zoneService.start(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ZONE_START,
      primary: { type: 'Zone', id },
    });
  }
}
