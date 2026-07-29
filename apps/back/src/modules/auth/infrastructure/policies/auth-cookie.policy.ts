const isProduction = process.env.NODE_ENV === 'production';

const secure =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === 'true'
    : isProduction;

const sameSite = secure ? 'none' : 'lax';
const domain = secure ? process.env.COOKIES_DOMAIN : undefined;

const REFRESH_PATH = '/api/auth';

const accessAttrs = {
  httpOnly: true,
  secure,
  sameSite,
  domain,
  path: '/',
} as const;

const refreshAttrs = {
  httpOnly: true,
  secure,
  sameSite,
  domain,
  path: REFRESH_PATH,
} as const;

// Readable by JS on purpose: the double-submit CSRF check compares this
// cookie against an X-CSRF-Token header the frontend sets from document.cookie.
const csrfAttrs = {
  httpOnly: false,
  secure,
  sameSite,
  domain,
  path: '/',
} as const;

export const AuthCookiePolicy = {
  access: { ...accessAttrs, maxAge: 15 * 60 * 1000 },
  refresh: { ...refreshAttrs, maxAge: 7 * 24 * 60 * 60 * 1000 },
  csrf: { ...csrfAttrs, maxAge: 15 * 60 * 1000 },
  clear: {
    access: accessAttrs,
    refresh: refreshAttrs,
    csrf: csrfAttrs,
  },
} as const;
