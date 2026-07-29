import type { Request } from 'express';

import { Utils } from '../../../../libs/utils';
import { InvalidCaptchaError } from '@/shared/domain/errors/invalid-captcha.error';
import { ServiceUnavailableError } from '@/shared/domain/errors/service-unavailable.error';

const VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

type SiteVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

export class CaptchaService {
  public static async verify(request: Request): Promise<void> {
    const secret = process.env.TURNSTILE_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableError();
      }
      return;
    }

    const token = request.body?.captchaToken as string | undefined;
    const { ipAddress } = Utils.parseRequestData(request);

    await this.verifyTurnstile(secret, token, ipAddress);
  }

  private static async verifyTurnstile(
    secret: string,
    token?: string,
    remoteIp?: string,
  ): Promise<void> {
    if (!token) {
      throw new InvalidCaptchaError();
    }

    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'Unknown') {
      body.append('remoteip', remoteIp);
    }

    let result: SiteVerifyResponse;
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
      result = (await res.json()) as SiteVerifyResponse;
    } catch {
      throw new ServiceUnavailableError();
    }

    if (!result.success) {
      throw new InvalidCaptchaError();
    }
  }
}
