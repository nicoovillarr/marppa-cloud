import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const capture = () => {
    const sent: { status?: number; body?: any } = {};
    const res = {
      status(code: number) {
        sent.status = code;
        return this;
      },
      json(body: any) {
        sent.body = body;
        return this;
      },
    };

    return {
      sent,
      host: { switchToHttp: () => ({ getResponse: () => res }) } as any,
    };
  };

  it('should answer 409 when a unique constraint rejects the write', () => {
    const { sent, host } = capture();

    filter.catch({ code: 'P2002', meta: { target: ['address'] } }, host);

    expect(sent.status).toBe(HttpStatus.CONFLICT);
    expect(sent.body.code).toBe('ALREADY_TAKEN');
    expect(sent.body.message).toContain('address');
  });

  it('should hide the deletedAt sentinel from the message', () => {
    const { sent, host } = capture();

    filter.catch(
      { code: 'P2002', meta: { target: ['address', 'deletedAt'] } },
      host,
    );

    expect(sent.body.message).toContain('address');
    expect(sent.body.message).not.toContain('deletedAt');
  });

  it('should keep answering 500 for anything unexpected', () => {
    const { sent, host } = capture();

    filter.catch(new Error('boom'), host);

    expect(sent.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(sent.body.code).toBe('INTERNAL_ERROR');
  });

  it('should still map a domain error to its own status', () => {
    const { sent, host } = capture();

    filter.catch(new NotFoundError('nope'), host);

    expect(sent.status).toBe(HttpStatus.NOT_FOUND);
    expect(sent.body.message).toBe('nope');
  });

  it('should pass through a NestJS HttpException with its real status instead of a 500', () => {
    const { sent, host } = capture();

    filter.catch(new UnauthorizedException('Usuario no autenticado'), host);

    expect(sent.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(sent.body.message).toBe('Usuario no autenticado');
  });
});
