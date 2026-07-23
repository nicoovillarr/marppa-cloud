const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export function getFrontendUrl(): string {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const firstCors = process.env.CORS_URL?.split(',')[0]?.trim();
  if (firstCors) {
    return firstCors.replace(/\/+$/, '');
  }

  return DEFAULT_FRONTEND_URL;
}
