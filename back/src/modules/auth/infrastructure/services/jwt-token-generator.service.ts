import { Injectable } from '@nestjs/common';

import { TokenGenerator } from '@/auth/domain/services/token-generator.service';
import { UserEntity } from '@/user/domain/entities/user.entity';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';

@Injectable()
export class JwtTokenGenerator implements TokenGenerator {
  constructor() { }

  async generateJwt(
    user: UserEntity,
    type: 'access' | 'refresh',
  ): Promise<string> {
    const { SignJWT } = await import('jose');

    const jwtEntity = new JwtEntity(user.id!, user.email, type);

    return await new SignJWT({ ...jwtEntity })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(type === 'access' ? '15m' : '7d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  }

  async validateJwt(token: string): Promise<JwtEntity> {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
    );

    return new JwtEntity(
      payload.userId as string,
      payload.email as string,
      payload.type as 'access' | 'refresh',
    );
  }
}
