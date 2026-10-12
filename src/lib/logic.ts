import { AppData, Routine, Task } from './types';
import { DateKey, addDays, diffDays, weekday } from './dates';

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/* ---------------- Carry forward ---------------- */

/**
 * Moves every pending task dated before today onto today, recording each
 * skipped day in its history. Returns the same object if nothing changed.
 */
export function rollover(data: AppData, today: DateKey): AppData {
  let changed = false;
  const tasks = data.tasks.map((t) => {
    if (t.status !== 'pending' || t.currentDate >= today) return t;
    changed = true;
    const carried = new Set(t.carriedFrom);
    // Record every day from its current date up to yesterday (capped at a year).
    const gap = Math.min(diffDays(t.currentDate, today), 366);
    for (let i = 0; i < gap; i++) carried.add(addDays(t.currentDate, i));
    return { ...t, currentDate: today, carriedFrom: [...carried].sort() };
  });
  return changed ? { ...data, tasks } : data;
}

export function carriedDays(t: Task): number {
  return t.carriedFrom.length;
}

export type AgeLevel = 'none' | 'soft' | 'warn' | 'alert';
export function ageLevel(days: number): AgeLevel {
  if (days <= 0) return 'none';
  if (days === 1) return 'soft';
  if (days <= 3) return 'warn';
  return 'alert';
}

/* ---------------- Routines ---------------- */

export function isPausedOn(r: Routine, date: DateKey): boolean {
  return r.pauses.some((p) => p.from <= date && (!p.to || date < p.to));
}

export function isPausedNow(r: Routine): boolean {
  return r.pauses.some((p) => !p.to);
}

export function isEnded(r: Routine, today: DateKey): boolean {
  return !!r.endDate && r.endDate <= today;
}

export function routineDueOn(r: Routine, date: DateKey): boolean {
  if (date < r.startDate) return false;
  if (r.endDate && date >= r.endDate) return false;
  if (isPausedOn(r, date)) return false;
  return r.days.includes(weekday(date));
}

export function routineDoneOn(r: Routine, date: DateKey): boolean {
  return r.doneDates.includes(date);
}

export function scheduleLabel(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Every day';
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '0,6') return 'Weekends';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (sorted.length === 1) return `Every ${names[sorted[0]]}`;
  // Show Monday first.
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => sorted.includes(d));
  return order.map((d) => names[d]).join(', ');
}

/** Current streak of consecutive due days completed, ending today (or yesterday if today not yet done). */
export function routineStreak(r: Routine, today: DateKey): number {
  let streak = 0;
  let day = today;
  if (routineDueOn(r, day) && !routineDoneOn(r, day)) day = addDays(day, -1);
  for (let i = 0; i < 730; i++) {
    if (day < r.startDate) break;
    if (routineDueOn(r, day)) {
      if (!routineDoneOn(r, day)) break;
      streak++;
    }
    day = addDays(day, -1);
  }
  return streak;
}

/* ---------------- Day views ---------------- */

export interface DayView {
  date: DateKey;
  kind: 'past' | 'today' | 'future';
  /** Pending one-offs showing on this day (today / future only). */
  pending: Task[];
  /** One-offs completed on this day. */
  done: Task[];
  /** One-offs carried away from this day unfinished (past only). */
  carried: Task[];
  /** One-offs let go on this day. */
  letGo: Task[];
  routinesDue: Routine[];
  routinesDone: Routine[];
  routinesMissed: Routine[];
  planned: number;
  completed: number;
}

export function dayView(data: AppData, date: DateKey, today: DateKey): DayView {
  const kind = date < today ? 'past' : date === today ? 'today' : 'future';
  const pending = kind === 'past' ? [] : data.tasks.filter((t) => t.status === 'pending' && t.currentDate === date);
  const done = data.tasks.filter((t) => t.status === 'done' && t.completedDate === date);
  const carried = data.tasks.filter((t) => t.carriedFrom.includes(date));
  const letGo = data.tasks.filter((t) => t.status === 'letgo' && t.letGoDate === date);

  const routinesDue = data.routines.filter((r) => routineDueOn(r, date));
  const routinesDone = routinesDue.filter((r) => routineDoneOn(r, date));
  const routinesMissed = kind === 'past' ? routinesDue.filter((r) => !routineDoneOn(r, date)) : [];

  const planned = pending.length + done.length + carried.length + letGo.length + routinesDue.length;
  const completed = done.length + routinesDone.length;

  byCreated(pending);
  return { date, kind, pending, done, carried, letGo, routinesDue, routinesDone, routinesMissed, planned, completed };
}

function byCreated(list: Task[]) {
  // Oldest carried first, then by creation time.
  list.sort((a, b) => carriedDays(b) - carriedDays(a) || a.createdAt - b.createdAt);
}

/**
 * Counts for the reminder on a given day, assuming nothing changes before then
 * (unfinished tasks would carry onto that day).
 */
export function projectedCounts(data: AppData, date: DateKey, today: DateKey) {
  const tasks = data.tasks.filter(
    (t) => t.status === 'pending' && (date === today ? t.currentDate === today : t.currentDate <= date),
  ).length;
  const routines = data.routines.filter((r) => routineDueOn(r, date) && !routineDoneOn(r, date)).length;
  return { tasks, routines };
}

/* ---------------- Backup validation ---------------- */

export function isValidData(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false;
  const d = x as AppData;
  return d.version === 1 && Array.isArray(d.tasks) && Array.isArray(d.routines) && !!d.settings;
}
