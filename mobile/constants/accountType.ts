/** Stored/API account type — `personal` displays as Athlete in the UI. */
export type AccountTypeValue = 'personal' | 'club';

/** Uppercase badge label (e.g. event cards, search, connections). */
export function accountTypeBadgeLabel(accountType: AccountTypeValue | string | undefined): string {
  return accountType === 'club' ? 'CLUB' : 'ATHLETE';
}

/** Signup / account-type picker label. */
export function accountTypeSignupLabel(accountType: AccountTypeValue): string {
  return accountType === 'club' ? 'CLUB' : 'ATHLETE';
}

export function isAthleteAccount(accountType: AccountTypeValue | string | undefined): boolean {
  return accountType !== 'club';
}
