
import { createHash } from 'crypto';

export function sha256Hash(value: string): string {
  // ObjectId ba onno kono non-string value bhule pathiye dile o crash na kore,
  // tai String() diye coerce kore nichi
  const stringValue = String(value);
  return createHash('sha256').update(stringValue.trim().toLowerCase()).digest('hex');
}

// Phone number normalize kore hash — country code shoho format thakte hobe (e.g. 8801xxxxxxxxx)
export function normalizeAndHashPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, ''); // shudhu number rakhbe, +, space, dash shob fele dibe
  return sha256Hash(digitsOnly);
}

export function hashEmail(email: string): string {
  return sha256Hash(email);
}