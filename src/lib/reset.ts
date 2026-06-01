// MapleStory GMS reset-period math, all in UTC.
// Daily reset: 00:00 UTC. Weekly boss reset: Thursday 00:00 UTC. Monthly: 1st 00:00 UTC.

import type { Reset } from "./bosses";

const DAY = 24 * 60 * 60 * 1000;

export function dayStartUTC(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Most recent Thursday 00:00 UTC at or before `now` (getUTCDay: Thu === 4).
export function weekStartUTC(now: number): number {
  const todayStart = dayStartUTC(now);
  const dow = new Date(todayStart).getUTCDay();
  const daysSinceThursday = (dow - 4 + 7) % 7;
  return todayStart - daysSinceThursday * DAY;
}

export function monthStartUTC(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function periodStartFor(reset: Reset, now: number): number {
  switch (reset) {
    case "daily":
      return dayStartUTC(now);
    case "weekly":
      return weekStartUTC(now);
    case "monthly":
      return monthStartUTC(now);
  }
}

// A clear timestamp counts as "cleared now" only if it falls in the current period.
export function isClearedNow(
  ts: number | undefined,
  reset: Reset,
  now: number
): boolean {
  return ts != null && ts >= periodStartFor(reset, now);
}

// When the next reset happens for a reset type, as epoch ms.
export function nextResetAt(reset: Reset, now: number): number {
  switch (reset) {
    case "daily":
      return dayStartUTC(now) + DAY;
    case "weekly":
      return weekStartUTC(now) + 7 * DAY;
    case "monthly": {
      const d = new Date(monthStartUTC(now));
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }
  }
}

export function daysInMonth(now: number): number {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

// Number of Thursdays (weekly boss resets) in the current month.
export function thursdaysInMonth(now: number): number {
  const d = new Date(now);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const total = daysInMonth(now);
  let count = 0;
  for (let day = 1; day <= total; day++) {
    if (new Date(Date.UTC(year, month, day)).getUTCDay() === 4) count++;
  }
  return count;
}

// Short human hint, e.g. "resets in 5h" or "resets in 3d".
export function nextResetLabel(reset: Reset, now: number): string {
  const ms = nextResetAt(reset, now) - now;
  const hours = Math.max(0, Math.floor(ms / (60 * 60 * 1000)));
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
    return `resets in ${mins}m`;
  }
  if (hours < 48) return `resets in ${hours}h`;
  return `resets in ${Math.floor(hours / 24)}d`;
}
