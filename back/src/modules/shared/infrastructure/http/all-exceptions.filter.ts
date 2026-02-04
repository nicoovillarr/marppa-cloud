import { DomainError } from '@/shared/domain/errors/domain.error';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
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

    console.error('Unexpected error:', exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Error inesperado del servidor',
    });
  }
}
