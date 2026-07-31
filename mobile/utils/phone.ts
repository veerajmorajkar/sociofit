import { buildPhoneE164, findPhoneCountry, parsePhoneE164 } from '@/utils/authValidation';

/** Client-side phone normalization — prefer AuthPhoneInput + buildPhoneE164. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : trimmed;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return buildPhoneE164(findPhoneCountry('IN'), digits);
  if (digits.length > 10) return `+${digits}`;
  return digits ? `+${digits}` : trimmed;
}

export { buildPhoneE164, parsePhoneE164 };
