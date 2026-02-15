const isProduction = process.env.NODE_ENV === 'production';
const domain = isProduction ? process.env.COOKIES_DOMAIN : undefined;

export const AuthCookiePolicy = {
  access: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: domain,
    maxAge: 15 * 60 * 1000,
    path: '/',
  },
  refresh: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: domain,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: isProduction ? '/auth/tick' : '/api/auth/tick',
  },
} as const;
