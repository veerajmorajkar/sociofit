import {
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountry,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from '@/constants/phoneCountries';

export const PASSWORD_HINT =
  'At least 8 characters with uppercase, lowercase, and a number. No spaces.';

const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/;
const DISPLAY_NAME_RE = /^[a-zA-Z][a-zA-Z\s'-]{1,99}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeUsernameInput(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

export function sanitizeDisplayNameInput(text: string): string {
  return text.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 100);
}

export function sanitizeEmailInput(text: string): string {
  return text.trim().toLowerCase().replace(/\s/g, '').slice(0, 254);
}

export function sanitizePhoneDigits(text: string, maxLength: number): string {
  return text.replace(/\D/g, '').slice(0, maxLength);
}

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (value.length < 3) return 'Username must be at least 3 characters.';
  if (value.length > 30) return 'Username must be at most 30 characters.';
  if (/\s/.test(value)) return 'Username cannot contain spaces.';
  if (!/^[a-z]/.test(value)) return 'Username must start with a letter.';
  if (!USERNAME_RE.test(value)) return 'Use only lowercase letters, numbers, and underscores.';
  return null;
}

export function validateDisplayName(name: string, isClub = false): string | null {
  const value = name.trim();
  if (value.length < 2)
    return isClub
      ? 'Club name must be at least 2 characters.'
      : 'Name must be at least 2 characters.';
  if (value.length > 100) return 'Name must be at most 100 characters.';
  if (!DISPLAY_NAME_RE.test(value)) {
    return 'Use letters, spaces, hyphens, and apostrophes only.';
  }
  if (!/[a-zA-Z]/.test(value)) return 'Name must include at least one letter.';
  return null;
}

export function validateEmail(email: string): string | null {
  const value = sanitizeEmailInput(email);
  if (!value) return 'Please enter your email address.';
  if (value.length > 254) return 'Email is too long.';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address.';
  return null;
}

export function buildPhoneE164(country: PhoneCountry, nationalDigits: string): string {
  return `+${country.dialCode}${nationalDigits}`;
}

export function validatePhone(countryCode: string, nationalDigits: string): string | null {
  const country = findPhoneCountry(countryCode);
  const digits = sanitizePhoneDigits(nationalDigits, country.nationalLength);
  if (!digits) return 'Please enter your phone number.';
  if (digits.length !== country.nationalLength) {
    return `Enter a ${country.nationalLength}-digit number for ${country.label}.`;
  }
  if (country.nationalPattern && !country.nationalPattern.test(digits)) {
    return `Enter a valid ${country.label} mobile number.`;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Please enter a password.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be at most 128 characters.';
  if (/\s/.test(password)) return 'Password cannot contain spaces.';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Include at least one number.';
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

/** Parse stored E.164 back to country + national digits when possible. */
export function parsePhoneE164(
  e164: string,
): { country: PhoneCountry; nationalDigits: string } | null {
  const digits = e164.replace(/\D/g, '');
  if (!digits) return null;

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sorted) {
    if (digits.startsWith(country.dialCode)) {
      const national = digits.slice(country.dialCode.length);
      if (national.length === country.nationalLength) {
        return { country, nationalDigits: national };
      }
    }
  }
  return null;
}

export { DEFAULT_PHONE_COUNTRY, findPhoneCountry };
