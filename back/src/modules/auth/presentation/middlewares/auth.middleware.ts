import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '@/auth/domain/services/auth.service';
import { sessionStorage } from '@/auth/infrastructure/als/session.context';
import { Request } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) { }

  async use(req: Request, _: any, next: () => void) {
    const token = req.cookies?.access_token;

    if (!token) {
      return next();
    }

    try {
      const payload = await this.authService.getTokenInformation(token);

      if (!payload) {
        return next();
      }

      if (payload.type !== 'access') {
        throw new UnauthorizedException('El token es inválido');
      }

      return sessionStorage.run({ user: payload }, () => {
        next();
      });
    } catch {
      next();
    }
  }
}
