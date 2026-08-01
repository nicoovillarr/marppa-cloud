import type { Prisma } from '@marppa-cloud/db';
import { ResourceStatus } from '@marppa-cloud/db';
import { Injectable } from '@/decorators/Injectable';
import { Inject } from '@/decorators/Inject';
import { PrismaService } from '@/shared/infrastructure/services/PrismaService';
import { WebSocketServer } from '@/shared/infrastructure/http/WebSocketServer';
import { LoggerService } from '@/shared/infrastructure/services/LoggerService';
import { MESH_SERVICE_TOKEN, MeshService } from '../domain/services/MeshService';
import { ORBIT_SERVICE_TOKEN, OrbitService } from '@/orbit/domain/services/OrbitService';
import { TeardownReport } from '@/shared/domain/TeardownReport';

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

    @Inject(ORBIT_SERVICE_TOKEN)
    private readonly orbitService: OrbitService,
  ) { }

  public async teardown(
    node: NodeTeardownPayload,
    macAddress: string | null,
    updatedBy: string,
    report: TeardownReport,
  ): Promise<void> {
    for (const fiber of node.fibers) {
      await this.removeFiberFromHost(node, fiber, report);
    }

    await this.prisma.fiber.deleteMany({ where: { nodeId: node.id } });

    await this.removeTranspondersRoutedToNode(node, updatedBy, report);

    if (macAddress) {
      const removed = await this.meshService.deleteNodeFromZone(
        node.zoneId,
        macAddress,
      );
      report.record(
        `dhcp reservation ${macAddress}`,
        removed ? 'removed' : 'absent',
      );
    }

    await this.prisma.node.delete({ where: { id: node.id } });
    report.record(`node ${node.id}`, 'removed');

    this.wsServer.sendNodeMessage(
      { id: node.id, ownerId: node.zone.ownerId },
      'DELETED',
      null,
    );
  }

  private async removeTranspondersRoutedToNode(
    node: NodeTeardownPayload,
    updatedBy: string,
    report: TeardownReport,
  ): Promise<void> {
    if (!node.transponders.length) {
      return;
    }

    const routedTransponders = node.transponders.filter(
      (transponder) => transponder.status !== ResourceStatus.DELETED,
    );

    await this.prisma.transponder.updateMany({
      where: { nodeId: node.id },
      data: { status: ResourceStatus.DELETED, nodeId: null, updatedBy },
    });

    const affectedPortalIds = [
      ...new Set(node.transponders.map((transponder) => transponder.portalId)),
    ];

    for (const portalId of affectedPortalIds) {
      const portal = await this.prisma.portal.findUnique({
        where: { id: portalId },
        include: { transponders: { include: { node: true } } },
      });

      if (!portal || portal.status === ResourceStatus.DELETED) {
        continue;
      }

      for (const transponder of routedTransponders) {
        if (transponder.portalId !== portalId) {
          continue;
        }

        this.logger.info(
          `[NodeTeardownService] Removing transponder ${transponder.id} (${transponder.path}) of node ${node.id}`,
        );

        this.wsServer.sendTransponderMessage(
          { id: transponder.id, portalId, ownerId: portal.ownerId },
          'DELETED',
          { status: ResourceStatus.DELETED },
        );

        report.record(`transponder ${transponder.id}`, 'removed', transponder.path);
      }

      const remainingTransponders = portal.transponders.filter(
        (transponder) => transponder.status !== ResourceStatus.DELETED,
      );

      if (remainingTransponders.length) {
        await this.orbitService.generatePortalConfig({
          ...portal,
          transponders: remainingTransponders,
        });
        report.record(
          `portal ${portal.id}`,
          'kept',
          `${remainingTransponders.length} transponders left`,
        );
        continue;
      }

      await this.deleteEmptiedPortal(portal, updatedBy, report);
    }
  }

  private async deleteEmptiedPortal(
    portal: { id: string; ownerId: string; address: string },
    updatedBy: string,
    report: TeardownReport,
  ): Promise<void> {
    this.logger.info(
      `[NodeTeardownService] Portal ${portal.id} has no transponders left, deleting it`,
    );

    await this.orbitService.deletePortalConfig(portal.id);

    await this.prisma.portal.update({
      where: { id: portal.id },
      data: {
        status: ResourceStatus.DELETED,
        deletedAt: new Date(),
        updatedBy,
      },
    });

    this.wsServer.sendPortalMessage(
      { id: portal.id, ownerId: portal.ownerId },
      'DELETED',
      { status: ResourceStatus.DELETED },
    );

    report.record(`portal ${portal.id}`, 'removed', portal.address);
  }

  private async removeFiberFromHost(
    node: NodeTeardownPayload,
    fiber: NodeTeardownPayload['fibers'][number],
    report: TeardownReport,
  ): Promise<void> {
    if (fiber.hostPort == null || fiber.status === ResourceStatus.DELETED) {
      report.record(`fiber ${fiber.id}`, 'absent', 'never published to the host');
      return;
    }

    this.logger.info(
      `[NodeTeardownService] Removing fiber ${fiber.id} (${fiber.protocol}/${fiber.hostPort}) of node ${node.id}`,
    );

    const removedRules = await this.meshService.removeFiber(
      node.zoneId,
      fiber.protocol,
      fiber.hostPort,
      node.ipAddress,
      fiber.targetPort,
    );

    report.record(
      `fiber ${fiber.id}`,
      removedRules ? 'removed' : 'absent',
      `${fiber.protocol}/${fiber.hostPort}, ${removedRules} nft rules`,
    );
  }
}
