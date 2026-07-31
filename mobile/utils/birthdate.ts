/** Calendar date helpers — avoid `toISOString()` which shifts the day in IST and other UTC+ timezones. */

/** e.g. "15 Mar 2000" */
export function formatBirthdateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** ISO datetime at UTC midnight for the selected local calendar day (API-safe). */
export function toBirthdateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000Z`;
}

/** Default picker value for users born ~2000. */
export function defaultBirthdatePickerValue(): Date {
  return new Date(2000, 0, 1);
}
