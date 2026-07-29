import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@marppa-cloud/db';

import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = getCurrentUser();
    if (!user) throw new UnauthorizedException('Usuario no autenticado');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'No tenés permisos suficientes para esta acción',
      );
    }

    return true;
  }
}
