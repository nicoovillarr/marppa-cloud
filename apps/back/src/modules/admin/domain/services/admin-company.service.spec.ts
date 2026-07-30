import { Test, TestingModule } from '@nestjs/testing';

import { AdminCompanyService } from './admin-company.service';
import {
  ADMIN_COMPANY_REPOSITORY_SYMBOL,
  AdminCompanyRepository,
} from '../repositories/admin-company.repository';
import { AdminCompanyModel } from '../models/admin-company.model';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { RootCompanyProtectedError } from '../errors/root-company-protected.error';
import { RootCompanyMissingError } from '../errors/root-company-missing.error';
import { CompanyNotEmptyError } from '../errors/company-not-empty.error';
import { CompanyParentRequiredError } from '../errors/company-parent-required.error';
import { CompanyCycleError } from '../errors/company-cycle.error';

const emptyCounts = { users: 0, workers: 0, atoms: 0, zones: 0, portals: 0 };

function company(
  id: string,
  parentCompanyId: string | null,
  counts = emptyCounts,
): AdminCompanyModel {
  return new AdminCompanyModel(
    id,
    `company-${id}`,
    null,
    null,
    parentCompanyId,
    new Date(),
    new Date(),
    counts,
  );
}

describe('AdminCompanyService', () => {
  let service: AdminCompanyService;
  let repository: AdminCompanyRepository;

  const root = company('root', null);
  const child = company('child', 'root');

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findRoot: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCompanyService,
        { provide: ADMIN_COMPANY_REPOSITORY_SYMBOL, useValue: mockRepository },
      ],
    }).compile();

    service = module.get(AdminCompanyService);
    repository = module.get(ADMIN_COMPANY_REPOSITORY_SYMBOL);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('hangs a new company off the root company', async () => {
      mockRepository.findRoot.mockResolvedValue(root);
      mockRepository.create.mockResolvedValue(child);

      await service.create({ name: 'acme' });

      expect(repository.create).toHaveBeenCalledWith({
        name: 'acme',
        parentCompanyId: 'root',
      });
    });

    it('never creates a second root company', async () => {
      mockRepository.findRoot.mockResolvedValue(root);
      mockRepository.create.mockResolvedValue(child);

      await service.create({ name: 'acme' } as any);

      const [[written]] = (repository.create as jest.Mock).mock.calls;
      expect(written.parentCompanyId).toBe('root');
    });

    it('refuses when no root company exists', async () => {
      mockRepository.findRoot.mockResolvedValue(null);

      await expect(service.create({ name: 'acme' })).rejects.toThrow(
        RootCompanyMissingError,
      );
    });
  });

  describe('update', () => {
    it('refuses to null a parent out, which would mint a platform admin', async () => {
      mockRepository.findById.mockResolvedValue(child);

      await expect(
        service.update('child', { name: 'acme', parentCompanyId: null } as any),
      ).rejects.toThrow(CompanyParentRequiredError);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuses to reparent the root company', async () => {
      mockRepository.findById.mockResolvedValue(root);

      await expect(
        service.update('root', { name: 'acme', parentCompanyId: 'child' }),
      ).rejects.toThrow(RootCompanyProtectedError);
    });

    it('refuses to move a company under its own descendant', async () => {
      const grandchild = company('grandchild', 'child');
      mockRepository.findById.mockImplementation(async (id: string) =>
        ({ root, child, grandchild } as any)[id] ?? null,
      );
      mockRepository.findAll.mockResolvedValue([root, child, grandchild]);

      await expect(
        service.update('child', {
          name: 'acme',
          parentCompanyId: 'grandchild',
        }),
      ).rejects.toThrow(CompanyCycleError);
    });

    it('allows a plain rename', async () => {
      mockRepository.findById.mockResolvedValue(child);
      mockRepository.update.mockResolvedValue(child);

      await service.update('child', { name: 'renamed' });

      expect(repository.update).toHaveBeenCalledWith('child', {
        name: 'renamed',
      });
    });
  });

  describe('delete', () => {
    it('refuses to delete the root company', async () => {
      mockRepository.findById.mockResolvedValue(root);

      await expect(service.delete('root')).rejects.toThrow(
        RootCompanyProtectedError,
      );
    });

    it('refuses to delete a company that still has users', async () => {
      mockRepository.findById.mockResolvedValue(
        company('child', 'root', { ...emptyCounts, users: 1 }),
      );

      await expect(service.delete('child')).rejects.toThrow(
        CompanyNotEmptyError,
      );
    });

    it('refuses to delete a company that still owns resources', async () => {
      mockRepository.findById.mockResolvedValue(
        company('child', 'root', { ...emptyCounts, workers: 2 }),
      );

      await expect(service.delete('child')).rejects.toThrow(
        CompanyNotEmptyError,
      );
    });

    it('deletes an empty non-root company', async () => {
      mockRepository.findById.mockResolvedValue(child);

      await service.delete('child');

      expect(repository.delete).toHaveBeenCalledWith('child');
    });

    it('throws when the company does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(NotFoundError);
    });
  });
});
