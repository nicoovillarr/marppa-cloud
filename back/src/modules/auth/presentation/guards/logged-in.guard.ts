import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { AuthService } from '@/auth/domain/services/auth.service';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';

@Injectable()
export class LoggedInGuard implements CanActivate {
  constructor(private readonly authService: AuthService) { }

  async canActivate(): Promise<boolean> {
    const jwt: JwtEntity | null = getCurrentUser();
    if (!jwt) throw new UnauthorizedException('Usuario no autenticado');

    return true;
  }
}
