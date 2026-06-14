import { randomInt } from 'crypto';

const LINE_ORDER_NUMBER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LINE_ORDER_NUMBER_LENGTH = 6;

export function generateRandomLineOrderNumber(): string {
  let result = '';
  for (let i = 0; i < LINE_ORDER_NUMBER_LENGTH; i += 1) {
    result += LINE_ORDER_NUMBER_CHARSET[randomInt(LINE_ORDER_NUMBER_CHARSET.length)];
  }
  return result;
}

export function isValidLineOrderNumber(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^[A-Z0-9]{6}$/.test(value);
}
