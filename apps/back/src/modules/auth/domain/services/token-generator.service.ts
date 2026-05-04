import { JwtEntity } from '@/auth/domain/entities/jwt.entity';

import { UserEntity } from '@/user/domain/entities/user.entity';

export const TOKEN_GENERATOR_SYMBOL = Symbol('TOKEN_GENERATOR');

export interface TokenGenerator {
  generateJwt(user: UserEntity, type: 'access' | 'refresh'): Promise<string>;
  validateJwt(token: string): Promise<JwtEntity>;
}
