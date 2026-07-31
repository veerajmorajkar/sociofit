export interface PhoneCountry {
  code: string;
  dialCode: string;
  label: string;
  /** National number length (digits only, excluding country code). */
  nationalLength: number;
  /** Optional pattern for national number (without country code). */
  nationalPattern?: RegExp;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    code: 'IN',
    dialCode: '91',
    label: 'India',
    nationalLength: 10,
    nationalPattern: /^[6-9]\d{9}$/,
  },
  {
    code: 'US',
    dialCode: '1',
    label: 'United States',
    nationalLength: 10,
    nationalPattern: /^[2-9]\d{9}$/,
  },
  {
    code: 'GB',
    dialCode: '44',
    label: 'United Kingdom',
    nationalLength: 10,
    nationalPattern: /^[1-9]\d{9}$/,
  },
  { code: 'AE', dialCode: '971', label: 'UAE', nationalLength: 9, nationalPattern: /^[5-9]\d{8}$/ },
  {
    code: 'SG',
    dialCode: '65',
    label: 'Singapore',
    nationalLength: 8,
    nationalPattern: /^[89]\d{7}$/,
  },
  {
    code: 'AU',
    dialCode: '61',
    label: 'Australia',
    nationalLength: 9,
    nationalPattern: /^[2-9]\d{8}$/,
  },
  {
    code: 'CA',
    dialCode: '1',
    label: 'Canada',
    nationalLength: 10,
    nationalPattern: /^[2-9]\d{9}$/,
  },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]!;

export function findPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? DEFAULT_PHONE_COUNTRY;
}
