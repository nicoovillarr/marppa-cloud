import { Test, TestingModule } from '@nestjs/testing';
import * as SessionContext from '@/auth/infrastructure/als/session.context';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { ConflictError } from '@/shared/domain/errors/conflict.error';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';
import { DnsApiKeyService } from './dns-api-key.service';
import { DNS_API_KEY_REPOSITORY } from '../repositories/dns-api-key.repository';
import { PORTAL_REPOSITORY } from '../repositories/portal.repository';
import { DNS_PROVIDER } from './dns-provider.service';
import { DnsApiKeyEntity } from '../entities/dns-api-key.entity';
import { PortalEntity } from '../entities/portal.entity';
import { PortalType } from '../enum/portal-type.enum';

describe('DnsApiKeyService', () => {
  let service: DnsApiKeyService;

  const key = new DnsApiKeyEntity(
    'Main',
    PortalType.CLOUDFLARE,
    'old-token',
    'u-000001',
    'c-000001',
    { id: 1 },
  );

  const portal = (id: string, status: ResourceStatus) =>
    new PortalEntity(
      id,
      `${id}.marppa.cloud`,
      PortalType.CLOUDFLARE,
      status,
      'u-000001',
      'c-000001',
      { id, dnsApiKeyId: 1 },
    );

  const mockRepository = {
    findById: jest.fn(),
    findByOwnerIdsWithUsage: jest.fn(),
    findByOwnerIdAndName: jest.fn(),
    countLivePortals: jest.fn(),
    create: jest.fn(async (entity: DnsApiKeyEntity) => entity),
    update: jest.fn(async (entity: DnsApiKeyEntity) => entity),
    delete: jest.fn(),
  };

  const mockPortalRepository = {
    findLiveByDnsApiKeyId: jest.fn(),
    update: jest.fn(async (entity: PortalEntity) => entity),
  };

  const mockDnsProvider = {
    assertCanManage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DnsApiKeyService,
        { provide: DNS_API_KEY_REPOSITORY, useValue: mockRepository },
        { provide: PORTAL_REPOSITORY, useValue: mockPortalRepository },
        { provide: DNS_PROVIDER, useValue: mockDnsProvider },
        {
          provide: CompanyHierarchyService,
          useValue: {
            selfAndDescendants: jest.fn(async (companyId: string) => [companyId]),
          },
        },
      ],
    }).compile();

    service = module.get(DnsApiKeyService);

    jest.spyOn(SessionContext, 'getCurrentUser').mockReturnValue({
      userId: 'u-000001',
      companyId: 'c-000001',
      email: 'test@test.com',
      type: 'access',
    } as any);

    mockRepository.findById.mockResolvedValue(key);
    mockRepository.findByOwnerIdAndName.mockResolvedValue(null);
    mockDnsProvider.assertCanManage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should store the key under the caller company', async () => {
      const result = await service.create({
        name: '  Main  ',
        type: PortalType.CLOUDFLARE,
        apiKey: ' token ',
      });

      expect(result).toEqual(
        expect.objectContaining({ name: 'Main', apiKey: 'token', ownerId: 'c-000001' }),
      );
    });

    it('should reject a duplicated name', async () => {
      mockRepository.findByOwnerIdAndName.mockResolvedValue(key);

      await expect(
        service.create({ name: 'Main', type: PortalType.CLOUDFLARE, apiKey: 'x' }),
      ).rejects.toThrow(ConflictError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findUsableForPortal', () => {
    it('should hide keys of other companies', async () => {
      mockRepository.findById.mockResolvedValue(key.clone({ ownerId: 'c-000002' }));

      await expect(
        service.findUsableForPortal(1, PortalType.CLOUDFLARE),
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject a key of another provider', async () => {
      mockRepository.findById.mockResolvedValue(key.clone({ type: PortalType.DYNU }));

      await expect(
        service.findUsableForPortal(1, PortalType.CLOUDFLARE),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('update', () => {
    it('should rename without touching portals', async () => {
      const result = await service.update(1, { name: 'Renamed' });

      expect(mockPortalRepository.findLiveByDnsApiKeyId).not.toHaveBeenCalled();
      expect(result.dnsApiKey.name).toBe('Renamed');
      expect(result.resyncedPortals).toEqual([]);
    });

    it('should verify the rotated token against every portal and requeue the settled ones', async () => {
      mockPortalRepository.findLiveByDnsApiKeyId.mockResolvedValue([
        portal('active', ResourceStatus.ACTIVE),
        portal('busy', ResourceStatus.UPDATING),
      ]);

      const result = await service.update(1, { apiKey: 'new-token' });

      expect(mockDnsProvider.assertCanManage).toHaveBeenCalledTimes(2);
      expect(mockDnsProvider.assertCanManage).toHaveBeenCalledWith(
        PortalType.CLOUDFLARE,
        'busy.marppa.cloud',
        'new-token',
      );
      expect(result.dnsApiKey.apiKey).toBe('new-token');
      expect(result.resyncedPortals.map((p) => p.id)).toEqual(['active']);
      expect(mockPortalRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'active', status: ResourceStatus.QUEUED }),
      );
    });

    it('should keep the old token when the new one cannot manage a portal', async () => {
      mockPortalRepository.findLiveByDnsApiKeyId.mockResolvedValue([
        portal('active', ResourceStatus.ACTIVE),
      ]);
      mockDnsProvider.assertCanManage.mockRejectedValue(new ForbiddenError());

      await expect(service.update(1, { apiKey: 'bad-token' })).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockPortalRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should refuse to delete a key still used by portals', async () => {
      mockRepository.countLivePortals.mockResolvedValue(2);

      await expect(service.delete(1)).rejects.toThrow(ConflictError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete an unused key', async () => {
      mockRepository.countLivePortals.mockResolvedValue(0);

      await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
