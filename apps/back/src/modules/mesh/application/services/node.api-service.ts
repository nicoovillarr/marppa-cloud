import { Injectable } from '@nestjs/common';
import { NodeService } from '../../domain/services/node.service';
import { NetmaskService } from '../../domain/services/netmask.service';
import { plainToInstance } from 'class-transformer';
import { CreateNodeDto } from '../../presentation/dtos/create-node.dto';
import { NodeResponseModel } from '../models/node.response-model';
import { ZoneService } from '../../domain/services/zone.service';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class NodeApiService {
  constructor(
    private readonly zoneService: ZoneService,
    private readonly nodeService: NodeService,
    private readonly netmaskService: NetmaskService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  public async findById(
    zoneId: string,
    id: string,
  ): Promise<NodeResponseModel> {
    const entity = await this.nodeService.findById(zoneId, id);
    return plainToInstance(NodeResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async findByZoneId(zoneId: string): Promise<NodeResponseModel[]> {
    const entities = await this.nodeService.findByZoneId(zoneId);
    return plainToInstance(NodeResponseModel, entities, {
      excludeExtraneousValues: true,
    });
  }

  public async create(
    zoneId: string,
    data: CreateNodeDto,
  ): Promise<NodeResponseModel> {
    const zonePayload = await this.zoneService.findByIdWithNodes(zoneId);
    if (zonePayload == null) {
      throw new NotFoundError();
    }

    const { zone, nodes } = zonePayload;
    const ipAddress = this.netmaskService.getNextIp(
      zone.cidr,
      zone.gateway,
      nodes.map((n) => n.ipAddress),
    );

    const entity = await this.nodeService.create(zoneId, data, ipAddress);

    // Un Node representa la presencia de un Worker (o Atom) dentro de una Zone.
    // Cuando se crea para un Worker, disparamos NODE_ASSIGN_WORKER para materializar
    // la reserva DHCP + el adjunto de la NIC en el host. El processor espera el Node
    // en QUEUED (estado de entrada) y el Worker en INACTIVE (ya creado).
    if (data.workerId) {
      await this.eventDispatch.dispatch({
        type: EventTypeKey.NODE_ASSIGN_WORKER,
        primary: { type: 'Node', id: entity.id! },
        related: [{ type: 'Worker', id: data.workerId }],
      });
    }

    return plainToInstance(NodeResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public delete(zoneId: string, id: string): Promise<void> {
    return this.nodeService.delete(zoneId, id);
  }
}
