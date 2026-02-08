import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository, USER_REPOSITORY_SYMBOL } from '../repositories/user.reposity';
import { PasswordHasher, PASSWORD_HASHER_SYMBOL } from './password-hasher.service';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';
import { InvalidEmailError } from '../errors/invalid-email.error';
import { EmailConflictError } from '../errors/email-conflict.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import * as sessionContext from '@/auth/infrastructure/als/session.context';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;
  let passwordHasher: PasswordHasher;

  const mockUser: UserEntity = new UserEntity(
    'test@example.com',
    'hashedPassword123',
    'Test User',
    'c-000001',
    {
      id: 'u-000001',
    }
  );

  const mockUserRepository = {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    findUserById: jest.fn(),
    emailExists: jest.fn(),
    findUserByEmail: jest.fn(),
  };

  const mockPasswordHasher = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY_SYMBOL,
          useValue: mockUserRepository,
        },
        {
          provide: PASSWORD_HASHER_SYMBOL,
          useValue: mockPasswordHasher,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(USER_REPOSITORY_SYMBOL);
    passwordHasher = module.get<PasswordHasher>(PASSWORD_HASHER_SYMBOL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        companyId: 'c-000001',
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockPasswordHasher.hash.mockResolvedValue('hashedPassword123');
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await service.createUser(dto);

      expect(repository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
      expect(repository.createUser).toHaveBeenCalledWith(expect.any(UserEntity));
      expect(result).toEqual(mockUser);
    });

    it('should throw InvalidEmailError for invalid email', async () => {
      const dto: CreateUserDto = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        companyId: 'c-000001',
      };

      await expect(service.createUser(dto)).rejects.toThrow(InvalidEmailError);
    });

    it('should throw EmailConflictError if email already exists', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        companyId: 'c-000001',
      };

      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(service.createUser(dto)).rejects.toThrow(EmailConflictError);
    });
  });

  describe('saveUser', () => {
    it('should create a new user if id is null', async () => {
      const newUser = new UserEntity(
        'new@example.com',
        'hashedPassword',
        'New User',
        'c-000001',
      );

      mockUserRepository.createUser.mockResolvedValue(newUser);

      const result = await service.saveUser(newUser);

      expect(repository.createUser).toHaveBeenCalledWith(newUser);
      expect(repository.updateUser).not.toHaveBeenCalled();
      expect(result).toEqual(newUser);
    });

    it('should update an existing user if id exists', async () => {
      const existingUser = new UserEntity(
        'existing@example.com',
        'hashedPassword',
        'Existing User',
        'c-000001',
        { id: 'u-000001' }
      );

      mockUserRepository.updateUser.mockResolvedValue(existingUser);

      const result = await service.saveUser(existingUser);

      expect(repository.updateUser).toHaveBeenCalledWith(existingUser);
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(service.isValidEmail('test@example.com')).toBe(true);
      expect(service.isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('test@')).toBe(false);
      expect(service.isValidEmail('@example.com')).toBe(false);
      expect(service.isValidEmail('test@example')).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      const result = await service.emailExists('test@example.com');

      expect(repository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);

      const result = await service.emailExists('new@example.com');

      expect(repository.emailExists).toHaveBeenCalledWith('new@example.com');
      expect(result).toBe(false);
    });
  });

  describe('findCurrentUser', () => {
    it('should return current user from context', async () => {
      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue({
        userId: 'u-000001',
        email: 'test@example.com',
      } as any);

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await service.findCurrentUser();

      expect(repository.findUserById).toHaveBeenCalledWith('u-000001');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedError if no user in context', async () => {
      jest.spyOn(sessionContext, 'getCurrentUser').mockReturnValue(null);

      await expect(service.findCurrentUser()).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('findUserById', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await service.findUserById('u-000001');

      expect(repository.findUserById).toHaveBeenCalledWith('u-000001');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await service.findUserById('u-999999');

      expect(repository.findUserById).toHaveBeenCalledWith('u-999999');
      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should return a user by email', async () => {
      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);

      const result = await service.findUserByEmail('test@example.com');

      expect(repository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should throw InvalidCredentialsError if user not found', async () => {
      mockUserRepository.findUserByEmail.mockResolvedValue(null);

      await expect(service.findUserByEmail('notfound@example.com')).rejects.toThrow(
        InvalidCredentialsError
      );
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      mockPasswordHasher.verify.mockResolvedValue(true);

      const result = await service.comparePassword('password123', 'hashedPassword123');

      expect(passwordHasher.verify).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      mockPasswordHasher.verify.mockResolvedValue(false);

      const result = await service.comparePassword('wrongpassword', 'hashedPassword123');

      expect(passwordHasher.verify).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
      expect(result).toBe(false);
    });
  });
});
