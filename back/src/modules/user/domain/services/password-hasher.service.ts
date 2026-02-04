export const PASSWORD_HASHER_SYMBOL = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
