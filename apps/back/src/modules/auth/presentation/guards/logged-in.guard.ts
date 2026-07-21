import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class LoggedInGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const jwt: JwtEntity | null = getCurrentUser();
    if (!jwt) throw new UnauthorizedException('Usuario no autenticado');

    return true;
  }
}
