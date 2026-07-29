import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PasswordHasher } from '@/user/domain/services/password-hasher.service';

// OWASP-recommended argon2id baseline for interactive login hashing.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class Argon2PasswordHasherService implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return await argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, plain);
  }
}
