import { DomainError } from '@/shared/domain/errors/domain.error';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof DomainError) {
      return res.status(exception.code).json({
        message: exception.message,
      });
    }

    const conflict = this.uniqueConstraintConflict(exception);
    if (conflict) {
      return res.status(HttpStatus.CONFLICT).json({
        code: 'ALREADY_TAKEN',
        message: conflict,
      });
    }

    // Guards, ValidationPipe and the throttler already craft a safe status +
    // message (no stack traces, no internals) — pass those through as-is
    // instead of collapsing them into a generic 500.
    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    console.error('Unexpected error:', exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
    });
  }

  private uniqueConstraintConflict(exception: any): string | null {
    if (exception?.code !== 'P2002') {
      return null;
    }

    const target = exception?.meta?.target;
    const fields = (Array.isArray(target) ? target : [target])
      .filter((field: unknown): field is string => typeof field === 'string')
      .filter((field: string) => field !== 'deletedAt');

    if (fields.length === 0) {
      return 'That value is already taken.';
    }

    return `${fields.join(' and ')} already taken.`;
  }
}
