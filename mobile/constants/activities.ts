export interface Activity {
  id: string;
  label: string;
  icon: string;
}

export const ACTIVITIES: Activity[] = [
  { id: 'running', label: 'Running', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'zumba', label: 'Zumba', icon: '💃' },
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'crossfit', label: 'CrossFit', icon: '🔥' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'table_tennis', label: 'Table Tennis', icon: '🏓' },
  { id: 'squash', label: 'Squash', icon: '🎯' },
  { id: 'pickleball', label: 'Pickleball', icon: '🥒' },
  { id: 'hockey', label: 'Hockey', icon: '🏑' },
  { id: 'rugby', label: 'Rugby', icon: '🏉' },
  { id: 'golf', label: 'Golf', icon: '⛳' },
  { id: 'boxing', label: 'Boxing', icon: '🥊' },
  { id: 'martial_arts', label: 'Martial Arts', icon: '🥋' },
  { id: 'dance', label: 'Dance', icon: '🕺' },
  { id: 'pilates', label: 'Pilates', icon: '🤍' },
  { id: 'hiking', label: 'Hiking', icon: '🥾' },
  { id: 'skating', label: 'Skating', icon: '⛸️' },
  { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
  { id: 'triathlon', label: 'Triathlon', icon: '🏊‍♂️' },
  { id: 'functional_training', label: 'Functional Training', icon: '💪' },
  { id: 'outdoor', label: 'Outdoor Adventure', icon: '🌄' },
  { id: 'fun_events', label: 'Social & Fun', icon: '🎉' },
];

export const MIN_ACTIVITIES = 3;

export function activityLabel(id: string): string {
  return ACTIVITIES.find((a) => a.id === id)?.label ?? id.replace(/_/g, ' ');
}

export function activityIcon(id: string): string {
  return ACTIVITIES.find((a) => a.id === id)?.icon ?? '🏅';
}
