import { TokenStorageService } from '@/auth/domain/services/token-storage.service';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { type Request, Response } from 'express';
import { AuthCookiePolicy } from '../policies/auth-cookie.policy';

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
    this.res.cookie('has_session', '1', AuthCookiePolicy.sessionMarker);
  }

  setCsrfToken(token: string): void {
    this.res.cookie('csrf_token', token, AuthCookiePolicy.csrf);
  }

  clear(): void {
    this.res.clearCookie('access_token', AuthCookiePolicy.clear.access);
    this.res.clearCookie('refresh_token', AuthCookiePolicy.clear.refresh);
    this.res.clearCookie('csrf_token', AuthCookiePolicy.clear.csrf);
    this.res.clearCookie('has_session', AuthCookiePolicy.clear.sessionMarker);
  }
}
