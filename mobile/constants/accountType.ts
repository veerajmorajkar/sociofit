/** Stored/API account type — `personal` displays as Athlete in the UI. */
export type AccountTypeValue = 'personal' | 'club';

export const ACCOUNT_TYPE_ICONS = {
  personal: require('@/assets/images/athlete_account_icon.png'),
  club: require('@/assets/images/club_account_icon.png'),
} as const;

/** Gold outline on club icon for visibility on purple backgrounds. */
export const CLUB_ICON_OUTLINE_COLOR = '#E8C96A';

/** Brand tint for account-type icons (teal = athlete, purple = club). */
export function accountTypeIconColor(type: AccountTypeValue, selected = true): string {
  if (type === 'club') return selected ? '#7B4DFF' : 'rgba(168,130,255,0.55)';
  return selected ? '#00E5C3' : 'rgba(0,229,195,0.55)';
}

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
