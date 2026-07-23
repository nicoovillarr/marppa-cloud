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
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import {
  EventTypeKey as SharedEventTypeKey,
  getEventStateTransition,
} from '@marppa-cloud/api-types';

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
    await this.zoneService.findById(zoneId);
    const entity = await this.nodeService.findById(zoneId, id);
    return plainToInstance(NodeResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async findByZoneId(zoneId: string): Promise<NodeResponseModel[]> {
    await this.zoneService.findById(zoneId);
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

    // The processor writes a DHCP reservation into the zone's dnsmasq config and
    // attaches the VM NIC to its bridge: neither exists until ZONE_CREATE has
    // finished, so reject early instead of failing inside the processor.
    if (zone.status !== ResourceStatus.ACTIVE) {
      throw new Error(
        `Zone must be ACTIVE to add nodes to it (is ${zone.status})`,
      );
    }

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
    // El Worker viaja como PARENT: si todavía está creándose (QUEUED/PROVISIONING)
    // el EventWorker difiere el job en vez de gastar reintentos, y si su creación
    // falló, el assign aborta con NODE_ASSIGN_WORKER_FAILED en vez de reintentar.
    if (data.workerId) {
      await this.eventDispatch.dispatch({
        type: EventTypeKey.NODE_ASSIGN_WORKER,
        primary: { type: 'Node', id: entity.id! },
        parent: { type: 'Worker', id: data.workerId },
      });
    }

    return plainToInstance(NodeResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * "Deleting" a worker-backed node means unassigning the worker: the
   * NODE_UNASSIGN_WORKER processor removes the DHCP reservation and the VM's
   * NIC on the host, then leaves the node INACTIVE. Hard-deleting the row here
   * would orphan both. The worker must already be terminated (INACTIVE).
   */
  public async delete(zoneId: string, id: string): Promise<void> {
    await this.zoneService.findById(zoneId);
    const node = await this.nodeService.findById(zoneId, id);

    if (node.workerId == null) {
      // No worker attached (atom or never-assigned node): nothing exists on
      // the host for it, a plain row delete is safe.
      await this.nodeService.delete(zoneId, id);
      return;
    }

    const entry = getEventStateTransition(SharedEventTypeKey.NODE_UNASSIGN_WORKER).entry;
    if (node.status !== entry) {
      throw new Error(
        `Node must be ${entry} to unassign its worker (is ${node.status})`,
      );
    }

    await this.eventDispatch.dispatch({
      type: EventTypeKey.NODE_UNASSIGN_WORKER,
      primary: { type: 'Node', id },
      related: [{ type: 'Worker', id: node.workerId }],
    });
  }
}
