import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const VALKEY_CLIENT_SYMBOL = Symbol('VALKEY_CLIENT');

export const ValkeyProvider: Provider = {
  provide: VALKEY_CLIENT_SYMBOL,
  useFactory: () => {
    return new Redis({
      host: process.env.VALKEY_HOST,
      port: Number(process.env.VALKEY_PORT),
      username: process.env.VALKEY_USERNAME,
      password: process.env.VALKEY_PASSWORD,
      tls: {},
    });
  },
};
