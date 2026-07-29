import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_HEADER = 'x-csrf-token';

@Injectable()
export class CsrfTokenMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    const cookieToken = req.cookies?.csrf_token;
    if (!cookieToken) {
      return next();
    }

    const headerToken = req.headers[CSRF_HEADER];

    if (typeof headerToken !== 'string' || headerToken !== cookieToken) {
      throw new ForbiddenException('Token CSRF inválido o ausente');
    }

    next();
  }
}
