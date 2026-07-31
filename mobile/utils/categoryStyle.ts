import { colors } from '@/constants/theme';

export interface CategoryPillTheme {
  icon: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const DEFAULT_THEME: CategoryPillTheme = {
  icon: '🏅',
  backgroundColor: 'rgba(91,46,204,0.14)',
  borderColor: 'rgba(168,130,255,0.35)',
  textColor: colors.purpleSoft,
};

const ENDURANCE_THEME: CategoryPillTheme = {
  icon: '🏃',
  backgroundColor: 'rgba(91,46,204,0.16)',
  borderColor: 'rgba(168,130,255,0.4)',
  textColor: colors.purpleSoft,
};

const CYCLING_THEME: CategoryPillTheme = {
  icon: '🚴',
  backgroundColor: 'rgba(59,111,204,0.14)',
  borderColor: 'rgba(120,160,255,0.38)',
  textColor: '#9BB8FF',
};

const MIND_BODY_THEME: CategoryPillTheme = {
  icon: '🧘',
  backgroundColor: 'rgba(0,229,195,0.1)',
  borderColor: 'rgba(0,229,195,0.32)',
  textColor: colors.tealPrimary,
};

const TEAM_SPORT_THEME: CategoryPillTheme = {
  icon: '⚽',
  backgroundColor: 'rgba(123,47,190,0.14)',
  borderColor: 'rgba(180,120,255,0.35)',
  textColor: '#C9A0FF',
};

const OUTDOOR_THEME: CategoryPillTheme = {
  icon: '🥾',
  backgroundColor: 'rgba(45,106,79,0.18)',
  borderColor: 'rgba(0,191,165,0.32)',
  textColor: colors.tealMid,
};

const SOCIAL_THEME: CategoryPillTheme = {
  icon: '🎉',
  backgroundColor: 'rgba(122,92,46,0.16)',
  borderColor: 'rgba(201,168,76,0.38)',
  textColor: colors.goldLight,
};

const STRENGTH_THEME: CategoryPillTheme = {
  icon: '🏋️',
  backgroundColor: 'rgba(91,46,204,0.12)',
  borderColor: 'rgba(168,130,255,0.32)',
  textColor: colors.purpleSoft,
};

/** Per-sport emoji overrides */
const CATEGORY_ICONS: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  yoga: '🧘',
  zumba: '💃',
  gym: '🏋️',
  crossfit: '🔥',
  football: '⚽',
  cricket: '🏏',
  basketball: '🏀',
  badminton: '🏸',
  tennis: '🎾',
  volleyball: '🏐',
  'table-tennis': '🏓',
  table_tennis: '🏓',
  squash: '🎯',
  pickleball: '🥒',
  hockey: '🏑',
  rugby: '🏉',
  golf: '⛳',
  boxing: '🥊',
  'martial-arts': '🥋',
  martial_arts: '🥋',
  dance: '🕺',
  pilates: '🤍',
  hiking: '🥾',
  skating: '⛸️',
  calisthenics: '🤸',
  triathlon: '🏊‍♂️',
  'functional-training': '💪',
  functional_training: '💪',
  outdoor: '🌄',
  'fun-events': '🎉',
  fun_events: '🎉',
  'yoga-zumba': '🧘',
  yoga_zumba: '🧘',
  'sports-games': '⚽',
  sports_games: '⚽',
  treks: '🥾',
  trek: '🥾',
};

const CATEGORY_THEMES: Record<string, CategoryPillTheme> = {
  running: ENDURANCE_THEME,
  triathlon: { ...ENDURANCE_THEME, icon: '🏊‍♂️' },
  cycling: CYCLING_THEME,
  swimming: { ...CYCLING_THEME, icon: '🏊' },
  yoga: MIND_BODY_THEME,
  zumba: { ...MIND_BODY_THEME, icon: '💃' },
  pilates: { ...MIND_BODY_THEME, icon: '🤍' },
  dance: { ...MIND_BODY_THEME, icon: '🕺' },
  'yoga-zumba': MIND_BODY_THEME,
  yoga_zumba: MIND_BODY_THEME,
  gym: STRENGTH_THEME,
  crossfit: { ...STRENGTH_THEME, icon: '🔥' },
  calisthenics: { ...STRENGTH_THEME, icon: '🤸' },
  'functional-training': STRENGTH_THEME,
  functional_training: STRENGTH_THEME,
  football: { ...TEAM_SPORT_THEME, icon: '⚽' },
  cricket: { ...TEAM_SPORT_THEME, icon: '🏏' },
  basketball: { ...TEAM_SPORT_THEME, icon: '🏀' },
  badminton: { ...TEAM_SPORT_THEME, icon: '🏸' },
  tennis: { ...TEAM_SPORT_THEME, icon: '🎾' },
  volleyball: { ...TEAM_SPORT_THEME, icon: '🏐' },
  'table-tennis': { ...TEAM_SPORT_THEME, icon: '🏓' },
  table_tennis: { ...TEAM_SPORT_THEME, icon: '🏓' },
  squash: { ...TEAM_SPORT_THEME, icon: '🎯' },
  pickleball: { ...TEAM_SPORT_THEME, icon: '🥒' },
  hockey: { ...TEAM_SPORT_THEME, icon: '🏑' },
  rugby: { ...TEAM_SPORT_THEME, icon: '🏉' },
  golf: { ...TEAM_SPORT_THEME, icon: '⛳' },
  boxing: { ...TEAM_SPORT_THEME, icon: '🥊' },
  'martial-arts': { ...TEAM_SPORT_THEME, icon: '🥋' },
  martial_arts: { ...TEAM_SPORT_THEME, icon: '🥋' },
  'sports-games': TEAM_SPORT_THEME,
  sports_games: TEAM_SPORT_THEME,
  hiking: OUTDOOR_THEME,
  treks: OUTDOOR_THEME,
  trek: OUTDOOR_THEME,
  outdoor: { ...OUTDOOR_THEME, icon: '🌄' },
  skating: { ...OUTDOOR_THEME, icon: '⛸️' },
  'fun-events': SOCIAL_THEME,
  fun_events: SOCIAL_THEME,
};

function normalizeSlug(slug?: string | null): string {
  return (slug ?? '').toLowerCase();
}

export function categoryPillTheme(slug?: string | null): CategoryPillTheme {
  if (!slug) return DEFAULT_THEME;
  const key = normalizeSlug(slug);
  const alt = key.replace(/-/g, '_');
  const base = CATEGORY_THEMES[key] ?? CATEGORY_THEMES[alt] ?? DEFAULT_THEME;
  const icon = CATEGORY_ICONS[key] ?? CATEGORY_ICONS[alt] ?? base.icon;
  return { ...base, icon };
}
