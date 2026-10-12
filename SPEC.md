# Daily Tasks: Phase 1 Spec

Personal-use Android app (Expo / React Native). Offline, no login, data stored on the device.

## Task types

**One-off task**: a single to-do on a date.
- Fields: title, note (optional), planned date.
- Statuses: pending, done, let go.
- Carry forward: when the day ends and it is still pending, it moves to today. The task keeps its original date and records every day it was carried from. The badge shows how many days it has been carried.
- Badge colour: 1 day soft amber, 2 to 3 days amber, 4+ days red.
- "Let go" drops the task without counting it as done. It stays in history.

**Routine**: repeats on a schedule.
- Repeat: every day, or chosen weekdays (pick one weekday for weekly).
- Never carries forward. Each due day gets its own check-off.
- A due day that passes without a check-off shows as "missed" in history.
- Can be paused (no missed days counted while paused), resumed, edited or ended.

## Screens

1. **Today**: date header, progress ring, Routines section, Tasks section (pending first, carried badge), Completed section (collapsed). Floating + button.
2. **Calendar**: month grid with a progress ring per day (done / planned). Tap a day to see:
   - Past day: done, carried over, let go, routines done and missed.
   - Today and future: what's planned.
3. **Routines**: list of routines with schedule and status. Pause, resume, edit, end.
4. **Settings**: daily reminder on/off and time, export backup, import backup, about.
5. **Add / Edit sheet**: title, note, date, "Repeat" toggle with weekday picker.

## Rules and edge cases

- Carry-forward runs when the app opens, when it comes back to the foreground, and at midnight while open.
- App not opened for several days: every pending task jumps straight to today, and each skipped day is recorded in its history.
- Rescheduling to another date is not counted as carrying.
- Completing a carried task counts as done on the day it was completed.
- Completed tasks can be unchecked (undo). Delete and Let go show a short Undo bar.
- Dates use the phone's local time zone.

## Calendar stats per day

- Planned = one-off tasks completed that day + carried from that day + let go that day + tasks due that day (today/future) + routines due that day.
- Done = one-off tasks completed that day + routines checked off that day.
- Ring = done / planned.

## Reminder

One notification per day at the chosen time, e.g. "You have 4 pending tasks and 2 routines today." Schedules the next 7 days with real counts, refreshed every time the app opens or data changes.

## Backup

Export writes a JSON file and opens the share sheet (save to Drive, WhatsApp to self, Files). Import reads that file and replaces current data after confirmation.

## Later phases

Phase 2: priority, categories or tags, per-task reminders, widget, search, stats and streaks, dark mode toggle.
Phase 3: accounts and sync, onboarding, Play Store listing, iOS, monetisation.
