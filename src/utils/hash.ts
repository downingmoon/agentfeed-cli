import { createHash, randomBytes } from 'node:crypto';

export function shortHash(value: string, length = 10): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

export function randomSuffix(length = 4): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
