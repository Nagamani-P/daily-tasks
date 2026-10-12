import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppData } from './types';
import { addDays, fromKey } from './dates';
import { projectedCounts } from './logic';

const CHANNEL = 'daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function bodyFor(tasks: number, routines: number): string {
  if (tasks === 0 && routines === 0) return 'Nothing planned yet. Add what matters today.';
  const parts: string[] = [];
  if (tasks) parts.push(plural(tasks, 'pending task'));
  if (routines) parts.push(plural(routines, 'routine'));
  return `You have ${parts.join(' and ')} today.`;
}

/**
 * Schedules one reminder per day for the next 7 days with the counts each day
 * would have. Called whenever data changes or the app opens.
 */
export async function refreshReminders(data: AppData, today: string) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const { reminderOn, reminderHour, reminderMinute } = data.settings;
    if (!reminderOn) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    const now = Date.now();
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      const at = fromKey(day);
      at.setHours(reminderHour, reminderMinute, 0, 0);
      if (at.getTime() <= now) continue;
      const { tasks, routines } = projectedCounts(data, day, today);
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Your day', body: bodyFor(tasks, routines) },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: CHANNEL,
        },
      });
    }
  } catch (e) {
    console.warn('Reminder scheduling failed', e);
  }
}
