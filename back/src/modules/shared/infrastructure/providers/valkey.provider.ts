import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const VALKEY_CLIENT_SYMBOL = Symbol('VALKEY_CLIENT');

export const ValkeyProvider: Provider = {
  provide: VALKEY_CLIENT_SYMBOL,
  useFactory: () => {
    const {
      VALKEY_HOST,
      VALKEY_PORT,
      VALKEY_USERNAME,
      VALKEY_PASSWORD,
    } = process.env;

    if (!VALKEY_HOST || !VALKEY_PORT || !VALKEY_USERNAME || !VALKEY_PASSWORD) {
      return null;
    }

    return new Redis({
      host: VALKEY_HOST,
      port: Number(VALKEY_PORT),
      username: VALKEY_USERNAME,
      password: VALKEY_PASSWORD,
      tls: {},
    });
  },
};
