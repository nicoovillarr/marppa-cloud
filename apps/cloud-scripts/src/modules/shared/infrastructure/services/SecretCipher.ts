import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Injectable } from '@/decorators/Injectable';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class SecretCipher {
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.WORKER_CONSOLE_SECRET_KEY;
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'WORKER_CONSOLE_SECRET_KEY is required: a 64-char hex string (32 bytes) ' +
        'used to encrypt worker console passwords at rest.',
      );
    }

    this.key = Buffer.from(hexKey, 'hex');
  }

  public encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv, authTag, ciphertext].map((buf) => buf.toString('base64')).join('.');
  }

  public decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Malformed encrypted payload');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
