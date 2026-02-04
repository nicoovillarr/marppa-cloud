import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PasswordHasher } from '@/user/domain/services/password-hasher.service';

@Injectable()
export class Argon2PasswordHasherService implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, plain);
  }
}
