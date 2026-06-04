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
  { id: 'gym', label: 'Gym', icon: '🏋️' },
  { id: 'crossfit', label: 'CrossFit', icon: '🔥' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'hiking', label: 'Hiking', icon: '🥾' },
  { id: 'boxing', label: 'Boxing', icon: '🥊' },
  { id: 'dance', label: 'Dance / Zumba', icon: '💃' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'martial_arts', label: 'Martial Arts', icon: '🥋' },
  { id: 'skating', label: 'Skating', icon: '⛸️' },
  { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
];

export const MIN_ACTIVITIES = 3;

export function activityLabel(id: string): string {
  return ACTIVITIES.find((a) => a.id === id)?.label ?? id;
}

export function activityIcon(id: string): string {
  return ACTIVITIES.find((a) => a.id === id)?.icon ?? '🏅';
}
