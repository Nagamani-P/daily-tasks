import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { AppData } from './types';
import { isValidData } from './logic';
import { todayKey } from './dates';

export async function exportBackup(data: AppData): Promise<void> {
  const file = new File(Paths.cache, `daily-tasks-backup-${todayKey()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your backup',
  });
}

/** Returns parsed data, or null if the person cancelled. Throws on an invalid file. */
export async function pickBackup(): Promise<AppData | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const text = await new File(res.assets[0].uri).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a Daily Tasks backup.');
  }
  if (!isValidData(parsed)) throw new Error('That file is not a Daily Tasks backup.');
  return parsed;
}
