export const TokenType = {
  USER_RESTORE: 'UserRestore',
  PASSWORD_RESET: 'PasswordReset',
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];
