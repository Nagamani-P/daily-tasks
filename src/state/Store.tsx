import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DEFAULT_DATA, Routine, Settings, Task } from '../lib/types';
import { DateKey, todayKey } from '../lib/dates';
import { isValidData, rollover, uid } from '../lib/logic';
import { refreshReminders } from '../lib/notify';

const KEY = 'daily-tasks:data:v1';

export interface TaskInput {
  title: string;
  note?: string;
  date: DateKey;
}
export interface RoutineInput {
  title: string;
  note?: string;
  days: number[];
}

interface Store {
  ready: boolean;
  data: AppData;
  today: DateKey;
  addTask(input: TaskInput): void;
  updateTask(id: string, input: TaskInput): void;
  toggleTask(id: string): void;
  letGoTask(id: string): void;
  deleteTask(id: string): void;
  restoreTask(task: Task): void;
  addRoutine(input: RoutineInput): void;
  updateRoutine(id: string, input: RoutineInput): void;
  toggleRoutine(id: string, date: DateKey): void;
  pauseRoutine(id: string): void;
  resumeRoutine(id: string): void;
  endRoutine(id: string): void;
  deleteRoutine(id: string): void;
  restoreRoutine(r: Routine): void;
  updateSettings(s: Partial<Settings>): void;
  replaceAll(data: AppData): void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

function msUntilMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return next.getTime() - now.getTime();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [today, setToday] = useState<DateKey>(todayKey());
  const loaded = useRef(false);

  // Load once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isValidData(parsed)) setData(rollover(parsed, todayKey()));
        }
      } catch (e) {
        console.warn('Load failed', e);
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  // Persist and refresh reminders on every change after load.
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch((e) => console.warn('Save failed', e));
    const t = setTimeout(() => refreshReminders(data, today), 400);
    return () => clearTimeout(t);
  }, [data, today]);

  // Day change: on foreground and at midnight.
  const checkDay = useCallback(() => {
    const now = todayKey();
    setToday((prev) => (prev === now ? prev : now));
    setData((d) => rollover(d, now));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && checkDay());
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        checkDay();
        arm();
      }, msUntilMidnight());
    };
    arm();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [checkDay]);

  const mapTask = (id: string, fn: (t: Task) => Task) =>
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t) : t)) }));
  const mapRoutine = (id: string, fn: (r: Routine) => Routine) =>
    setData((d) => ({ ...d, routines: d.routines.map((r) => (r.id === id ? fn(r) : r)) }));

  const store = useMemo<Store>(
    () => ({
      ready,
      data,
      today,
      addTask: ({ title, note, date }) =>
        setData((d) => ({
          ...d,
          tasks: [
            ...d.tasks,
            {
              id: uid(),
              title: title.trim(),
              note: note?.trim() || undefined,
              originalDate: date,
              currentDate: date,
              status: 'pending',
              carriedFrom: [],
              createdAt: Date.now(),
            },
          ],
        })),
      updateTask: (id, { title, note, date }) =>
        mapTask(id, (t) => ({
          ...t,
          title: title.trim(),
          note: note?.trim() || undefined,
          currentDate: t.status === 'pending' ? date : t.currentDate,
          // Before it has ever been carried, moving it also moves its planned date.
          originalDate: t.status === 'pending' && t.carriedFrom.length === 0 ? date : t.originalDate,
        })),
      toggleTask: (id) =>
        mapTask(id, (t) =>
          t.status === 'done'
            ? { ...t, status: 'pending', completedDate: undefined, currentDate: t.currentDate < today ? today : t.currentDate }
            : { ...t, status: 'done', completedDate: today, letGoDate: undefined },
        ),
      letGoTask: (id) => mapTask(id, (t) => ({ ...t, status: 'letgo', letGoDate: today })),
      deleteTask: (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
      restoreTask: (task) =>
        setData((d) => ({ ...d, tasks: [...d.tasks.filter((t) => t.id !== task.id), task] })),

      addRoutine: ({ title, note, days }) =>
        setData((d) => ({
          ...d,
          routines: [
            ...d.routines,
            {
              id: uid(),
              title: title.trim(),
              note: note?.trim() || undefined,
              days: [...days].sort(),
              startDate: today,
              pauses: [],
              doneDates: [],
              createdAt: Date.now(),
            },
          ],
        })),
      updateRoutine: (id, { title, note, days }) =>
        mapRoutine(id, (r) => ({ ...r, title: title.trim(), note: note?.trim() || undefined, days: [...days].sort() })),
      toggleRoutine: (id, date) =>
        mapRoutine(id, (r) => ({
          ...r,
          doneDates: r.doneDates.includes(date) ? r.doneDates.filter((x) => x !== date) : [...r.doneDates, date].sort(),
        })),
      pauseRoutine: (id) =>
        mapRoutine(id, (r) => (r.pauses.some((p) => !p.to) ? r : { ...r, pauses: [...r.pauses, { from: today }] })),
      resumeRoutine: (id) =>
        mapRoutine(id, (r) => ({
          ...r,
          // Resuming the same day it was paused simply removes that pause.
          pauses: r.pauses
            .map((p) => (p.to ? p : { ...p, to: today }))
            .filter((p) => !p.to || p.from < p.to),
        })),
      endRoutine: (id) => mapRoutine(id, (r) => ({ ...r, endDate: today, pauses: r.pauses.map((p) => (p.to ? p : { ...p, to: today })) })),
      deleteRoutine: (id) => setData((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) })),
      restoreRoutine: (routine) =>
        setData((d) => ({ ...d, routines: [...d.routines.filter((r) => r.id !== routine.id), routine] })),

      updateSettings: (s) => setData((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      replaceAll: (next) => setData(rollover(next, todayKey())),
    }),
    [ready, data, today],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
