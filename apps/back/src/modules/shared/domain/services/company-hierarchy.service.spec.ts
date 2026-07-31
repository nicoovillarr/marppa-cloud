import { Test, TestingModule } from '@nestjs/testing';

import { CompanyHierarchyService } from './company-hierarchy.service';
import {
  COMPANY_HIERARCHY_REPOSITORY_SYMBOL,
  CompanyHierarchyRepository,
} from '../repositories/company-hierarchy.repository';

describe('CompanyHierarchyService', () => {
  let service: CompanyHierarchyService;

  const mockRepository = {
    findParentLinks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyHierarchyService,
        {
          provide: COMPANY_HIERARCHY_REPOSITORY_SYMBOL,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get(CompanyHierarchyService);
    jest.clearAllMocks();
  });

  it('walks from a company up to the root', async () => {
    mockRepository.findParentLinks.mockResolvedValue([
      { id: 'root', parentCompanyId: null },
      { id: 'a', parentCompanyId: 'root' },
      { id: 'b', parentCompanyId: 'a' },
    ]);

    expect(await service.selfAndAncestors('b')).toEqual(['b', 'a', 'root']);
  });

  it('returns just the company when it is the root', async () => {
    mockRepository.findParentLinks.mockResolvedValue([
      { id: 'root', parentCompanyId: null },
    ]);

    expect(await service.selfAndAncestors('root')).toEqual(['root']);
  });

  it('never walks downward: a parent does not inherit from its child', async () => {
    mockRepository.findParentLinks.mockResolvedValue([
      { id: 'root', parentCompanyId: null },
      { id: 'a', parentCompanyId: 'root' },
      { id: 'b', parentCompanyId: 'a' },
    ]);

    expect(await service.selfAndAncestors('a')).not.toContain('b');
  });

  it('stops on a cycle instead of looping forever', async () => {
    mockRepository.findParentLinks.mockResolvedValue([
      { id: 'a', parentCompanyId: 'b' },
      { id: 'b', parentCompanyId: 'a' },
    ]);

    expect(await service.selfAndAncestors('a')).toEqual(['a', 'b']);
  });

  it('tolerates a dangling parent id', async () => {
    mockRepository.findParentLinks.mockResolvedValue([
      { id: 'orphan', parentCompanyId: 'gone' },
    ]);

    expect(await service.selfAndAncestors('orphan')).toEqual([
      'orphan',
      'gone',
    ]);
  });
});
