import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@marppa-cloud/db';

import { AdminUserService } from './admin-user.service';
import {
  ADMIN_USER_REPOSITORY_SYMBOL,
  AdminUserRepository,
} from '../repositories/admin-user.repository';
import { AdminUserModel } from '../models/admin-user.model';
import { UserService } from '@/user/domain/services/user.service';
import { LastOwnerProtectedError } from '../errors/last-owner-protected.error';
import { SelfDemotionError } from '../errors/self-demotion.error';
import { sessionStorage } from '@/auth/infrastructure/als/session.context';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';

function user(
  id: string,
  role: UserRole = UserRole.OWNER,
  companyId = 'c-1',
): AdminUserModel {
  return new AdminUserModel(
    id,
    `${id}@marppa.com`,
    id,
    role,
    companyId,
    'Acme',
    new Date(),
    new Date(),
  );
}

function asUser<T>(id: string, run: () => Promise<T>): Promise<T> {
  const jwt = new JwtEntity(id, `${id}@marppa.com`, 'c-1', 'access', UserRole.OWNER);
  return sessionStorage.run({ user: jwt }, run);
}

describe('AdminUserService', () => {
  let service: AdminUserService;
  let repository: AdminUserRepository;

  const mockRepository = {
    findPage: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countOwners: jest.fn(),
    revokeSessions: jest.fn(),
  };

  const mockUserService = {
    createUser: jest.fn(),
    updateUserPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        { provide: ADMIN_USER_REPOSITORY_SYMBOL, useValue: mockRepository },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get(AdminUserService);
    repository = module.get(ADMIN_USER_REPOSITORY_SYMBOL);
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('revokes every session when the password is reset', async () => {
      mockRepository.findById.mockResolvedValue(user('victim'));
      mockRepository.update.mockResolvedValue(user('victim'));
      mockRepository.countOwners.mockResolvedValue(2);

      await asUser('admin', () =>
        service.update('victim', { password: 'a-new-password' }),
      );

      expect(mockUserService.updateUserPassword).toHaveBeenCalledWith(
        'victim',
        'a-new-password',
      );
      expect(repository.revokeSessions).toHaveBeenCalledWith('victim');
    });

    it('revokes sessions when the role changes', async () => {
      mockRepository.findById.mockResolvedValue(user('victim'));
      mockRepository.update.mockResolvedValue(user('victim', UserRole.MEMBER));
      mockRepository.countOwners.mockResolvedValue(2);

      await asUser('admin', () =>
        service.update('victim', { role: UserRole.MEMBER }),
      );

      expect(repository.revokeSessions).toHaveBeenCalledWith('victim');
    });

    it('leaves sessions alone for a plain rename', async () => {
      mockRepository.findById.mockResolvedValue(user('victim'));
      mockRepository.update.mockResolvedValue(user('victim'));

      await asUser('admin', () =>
        service.update('victim', { name: 'New Name' }),
      );

      expect(repository.revokeSessions).not.toHaveBeenCalled();
    });

    it('refuses to demote the last owner of a company', async () => {
      mockRepository.findById.mockResolvedValue(user('only-owner'));
      mockRepository.countOwners.mockResolvedValue(1);

      await expect(
        asUser('admin', () =>
          service.update('only-owner', { role: UserRole.MEMBER }),
        ),
      ).rejects.toThrow(LastOwnerProtectedError);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuses to let an admin demote themselves', async () => {
      mockRepository.findById.mockResolvedValue(user('admin'));

      await expect(
        asUser('admin', () =>
          service.update('admin', { role: UserRole.MEMBER }),
        ),
      ).rejects.toThrow(SelfDemotionError);
    });
  });

  describe('delete', () => {
    it('refuses to let an admin delete their own account', async () => {
      mockRepository.findById.mockResolvedValue(user('admin'));

      await expect(
        asUser('admin', () => service.delete('admin')),
      ).rejects.toThrow(SelfDemotionError);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete the last owner of a company', async () => {
      mockRepository.findById.mockResolvedValue(user('only-owner'));
      mockRepository.countOwners.mockResolvedValue(1);

      await expect(
        asUser('admin', () => service.delete('only-owner')),
      ).rejects.toThrow(LastOwnerProtectedError);
    });

    it('deletes a member without touching the owner count', async () => {
      mockRepository.findById.mockResolvedValue(
        user('member', UserRole.MEMBER),
      );

      await asUser('admin', () => service.delete('member'));

      expect(repository.delete).toHaveBeenCalledWith('member');
      expect(repository.countOwners).not.toHaveBeenCalled();
    });
  });
});
