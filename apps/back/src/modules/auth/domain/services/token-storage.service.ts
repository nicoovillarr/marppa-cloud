export const TOKEN_STORAGE_SERVICE_SYMBOL = Symbol('TOKEN_STORAGE_SERVICE');

export abstract class TokenStorageService {
  abstract setAccessToken(token: string): void;
  abstract setRefreshToken(token: string): void;
  abstract clear(): void;
}
