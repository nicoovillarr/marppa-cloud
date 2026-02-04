import { TokenStorageService } from '@/auth/domain/services/token-storage.service';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { type Request, Response } from 'express';
import { AuthCookiePolicy } from '../policies/auth-cookie.policie';

@Injectable()
export class CookiesTokenStorageService implements TokenStorageService {
  private readonly res: Response;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.res = request.res!;
  }

  setAccessToken(token: string): void {
    this.res.cookie('access_token', token, AuthCookiePolicy.access);
  }

  setRefreshToken(token: string): void {
    this.res.cookie('refresh_token', token, AuthCookiePolicy.refresh);
  }

  clear(): void {
    throw new Error('Method not implemented.');
  }
}
