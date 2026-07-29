import { createHmac, timingSafeEqual } from 'crypto';

export function eventJobId(eventId: number | string): string {
  return `event-${eventId}`;
}

export function signEventJob(eventId: number, secret: string): string {
  return createHmac('sha256', secret).update(String(eventId)).digest('hex');
}

export function verifyEventJobSignature(
  eventId: number,
  signature: string | undefined,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret)
    .update(String(eventId))
    .digest();

  let actual: Buffer;
  try {
    actual = Buffer.from(signature ?? '', 'hex');
  } catch {
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
