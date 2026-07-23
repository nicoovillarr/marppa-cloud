import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as reachable without authentication.
 * Everything else is protected by the globally-registered LoggedInGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
