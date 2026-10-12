import { DateKey } from './dates';

export type TaskStatus = 'pending' | 'done' | 'letgo';

export interface Task {
  id: string;
  title: string;
  note?: string;
  /** The day it was first planned for. Never changes after creation (except edits before any carry). */
  originalDate: DateKey;
  /** The day it currently shows on. */
  currentDate: DateKey;
  status: TaskStatus;
  /** Every day this task was carried away from, unfinished. */
  carriedFrom: DateKey[];
  completedDate?: DateKey;
  letGoDate?: DateKey;
  createdAt: number;
}

export interface PauseRange {
  from: DateKey;
  /** Day it was resumed (exclusive). Undefined while still paused. */
  to?: DateKey;
}

export interface Routine {
  id: string;
  title: string;
  note?: string;
  /** Weekdays it is due on, 0 = Sunday. All 7 = every day. */
  days: number[];
  startDate: DateKey;
  /** Exclusive. Set when the routine is ended. */
  endDate?: DateKey;
  pauses: PauseRange[];
  /** Days it was checked off. */
  doneDates: DateKey[];
  createdAt: number;
}

export interface Settings {
  name?: string;
  reminderOn: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export interface AppData {
  version: 1;
  tasks: Task[];
  routines: Routine[];
  settings: Settings;
}

export const DEFAULT_DATA: AppData = {
  version: 1,
  tasks: [],
  routines: [],
  settings: { reminderOn: false, reminderHour: 8, reminderMinute: 0 },
};
