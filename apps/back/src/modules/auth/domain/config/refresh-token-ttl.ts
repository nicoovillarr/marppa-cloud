const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;

export function getRefreshTokenTtlDays(): number {
  const parsed = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_REFRESH_TOKEN_TTL_DAYS;
}
