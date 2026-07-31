/**
 * Returns a relative time string for a given ISO date string.
 * e.g. "2m ago", "3h ago", "2d ago", "Jan 15"
 */
export function timeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Calendar day + month only, e.g. "25th May".
 */
export function formatEventDayMonth(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'long' });
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  return `${day}${ordinalSuffix(day)} ${monthCap}`;
}

/**
 * Formats an ISO date string to a short event date/time label.
 * e.g. "Sun 6AM", "Mon Jan 20 · 7:00AM"
 */
export function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.toLocaleDateString('en-IN', { weekday: 'short' });
  const time = date
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
  return `${day} ${time}`;
}

/**
 * Formats an ISO date string to a full readable date.
 * e.g. "Sunday, Jan 20 · 6:00 AM"
 */
export function formatEventDateFull(isoDate: string): string {
  const date = new Date(isoDate);
  const datePart = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
  return `${datePart} · ${timePart}`;
}

/**
 * Full calendar date for event detail, e.g. "Saturday, 15 November 2026".
 */
export function formatEventDetailDate(isoDate: string): string {
  const date = new Date(isoDate);
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, ${day}${ordinalSuffix(day)} ${month} ${year}`;
}

/**
 * Time only, e.g. "7:00 AM".
 */
export function formatEventTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Compact pill for event detail hero, e.g. "15 Nov · 5:00 PM".
 */
export function formatEventDateTimePill(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const time = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day} ${month} · ${time}`;
}

/**
 * Formats price in paise to a display string.
 * 0 → "FREE", 50000 → "₹500"
 */
export function formatPrice(priceInr: number | null): string {
  if (!priceInr || priceInr === 0) return 'FREE';
  return `₹${Math.round(priceInr / 100)}`;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatChatShortDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const year = date.getFullYear();
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${year}`;
}

/** Day divider in chat — Today, Yesterday · date, or calendar date */
export function formatChatDayLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = startOfLocalDay(new Date());
  const msgDay = startOfLocalDay(date);
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return `Yesterday · ${formatChatShortDate(date)}`;

  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  return `${weekday} · ${formatChatShortDate(date)}`;
}

/** Tap-to-reveal timestamp on a single message */
export function formatChatMessageTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getChatDayKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
