import { Injectable } from '@/decorators/Injectable';
import { ResourceStatus } from '@marppa-cloud/db';
import { PrismaService } from './PrismaService';

export type ParentStateClassification =
  | { kind: 'ready'; status: ResourceStatus }
  | { kind: 'transient'; status: ResourceStatus }
  | { kind: 'failed'; status: ResourceStatus }
  | { kind: 'missing' };

const TRANSIENT_STATES: ResourceStatus[] = [
  ResourceStatus.QUEUED,
  ResourceStatus.PROVISIONING,
  ResourceStatus.UPDATING,
  ResourceStatus.TERMINATING,
  ResourceStatus.DELETING,
];

const FAILED_STATES: ResourceStatus[] = [
  ResourceStatus.FAILED,
  ResourceStatus.TERMINATED,
  ResourceStatus.DELETED,
];

@Injectable()
export class ParentStateService {
  constructor(private readonly prisma: PrismaService) {}

  public async classify(
    resourceType: string,
    resourceId: string,
  ): Promise<ParentStateClassification> {
    const status = await this.getStatus(resourceType, resourceId);
    if (status == null) return { kind: 'missing' };

    if (TRANSIENT_STATES.includes(status)) return { kind: 'transient', status };
    if (FAILED_STATES.includes(status)) return { kind: 'failed', status };
    return { kind: 'ready', status };
  }

  private async getStatus(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourceStatus | null> {
    const idAsNumber = Number(resourceId);
    const idValue: string | number = Number.isFinite(idAsNumber)
      ? idAsNumber
      : resourceId;

    switch (resourceType) {
      case 'Worker': {
        const row = await this.prisma.worker.findUnique({
          where: { id: resourceId },
          select: { status: true },
        });
        return row?.status ?? null;
      }
      case 'Node': {
        const row = await this.prisma.node.findUnique({
          where: { id: resourceId },
          select: { status: true },
        });
        return row?.status ?? null;
      }
      case 'Zone': {
        const row = await this.prisma.zone.findUnique({
          where: { id: resourceId },
          select: { status: true },
        });
        return row?.status ?? null;
      }
      case 'Fiber': {
        const row = await this.prisma.fiber.findUnique({
          where: { id: idAsNumber },
          select: { status: true },
        });
        return row?.status ?? null;
      }
      case 'Portal': {
        const row = await this.prisma.portal.findUnique({
          where: { id: resourceId },
          select: { status: true },
        });
        return row?.status ?? null;
      }
      case 'Transponder': {
        const row = await this.prisma.transponder.findUnique({
          where: { id: resourceId },
          select: { status: true },
        });
        return row?.status ?? null;
      }
      default:
        return null;
    }
  }
}
