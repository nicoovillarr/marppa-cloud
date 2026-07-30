import type { Prisma } from '@marppa-cloud/db';
import { ResourceStatus } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';

export type NodeTeardownPayload = Prisma.NodeGetPayload<{
  include: { fibers: true; transponders: true; zone: true };
}>;

export const nodeTeardownInclude = {
  fibers: true,
  transponders: true,
  zone: true,
} as const;

@Injectable()
export class NodeTeardownService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsServer: WebSocketServer,
    private readonly logger: LoggerService,

    @Inject(MESH_SERVICE_TOKEN)
    private readonly meshService: MeshService,
  ) { }

  public transpondersBlocking(node: NodeTeardownPayload): boolean {
    return node.transponders.length > 0;
  }

  public async teardown(
    node: NodeTeardownPayload,
    macAddress: string | null,
  ): Promise<void> {
    for (const fiber of node.fibers) {
      await this.removeFiberFromHost(node, fiber);
    }

    await this.prisma.fiber.deleteMany({ where: { nodeId: node.id } });

    if (macAddress) {
      await this.meshService.deleteNodeFromZone(node.zoneId, macAddress);
    }

    await this.prisma.node.delete({ where: { id: node.id } });

    this.wsServer.sendNodeMessage(
      { id: node.id, ownerId: node.zone.ownerId },
      'DELETED',
      null,
    );
  }

  private async removeFiberFromHost(
    node: NodeTeardownPayload,
    fiber: NodeTeardownPayload['fibers'][number],
  ): Promise<void> {
    if (fiber.hostPort == null || fiber.status === ResourceStatus.DELETED) {
      return;
    }

    this.logger.info(
      `[NodeTeardownService] Removing fiber ${fiber.id} (${fiber.protocol}/${fiber.hostPort}) of node ${node.id}`,
    );

    await this.meshService.removeFiber(
      node.zoneId,
      fiber.protocol,
      fiber.hostPort,
      node.ipAddress,
      fiber.targetPort,
    );
  }
}
