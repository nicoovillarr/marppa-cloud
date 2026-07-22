const isProduction = process.env.NODE_ENV === 'production';

// A `secure` cookie is dropped by every client over plain HTTP, which makes a
// production build on a LAN host (no TLS) log in "successfully" and then 401 on
// every call. COOKIE_SECURE=false opts out explicitly for those deployments.
const secure =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === 'true'
    : isProduction;

// SameSite=None is only legal on secure cookies; pair them.
const sameSite = secure ? 'none' : 'lax';
const domain = secure ? process.env.COOKIES_DOMAIN : undefined;

export const AuthCookiePolicy = {
  access: {
    httpOnly: true,
    secure,
    sameSite,
    domain: domain,
    maxAge: 15 * 60 * 1000,
    path: '/',
  },
  refresh: {
    httpOnly: true,
    secure,
    sameSite,
    domain: domain,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  },
} as const;
