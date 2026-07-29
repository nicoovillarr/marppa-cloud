import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originFromHeader(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly allowedOrigins = (process.env.CORS_URL ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  use(req: Request, _res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method) || this.allowedOrigins.length === 0) {
      return next();
    }

    const sourceHeader = req.headers.origin ?? req.headers.referer;
    const sourceOrigin =
      typeof sourceHeader === 'string' ? originFromHeader(sourceHeader) : null;

    if (!sourceOrigin || !this.allowedOrigins.includes(sourceOrigin)) {
      throw new ForbiddenException('Origen no permitido');
    }

    next();
  }
}
