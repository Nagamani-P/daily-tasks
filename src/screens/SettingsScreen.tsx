import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useStore } from '../state/Store';
import { Card, SectionHeader, useSnack } from '../ui/components';
import { Icon, IconName } from '../ui/Icon';
import { colors, space, type } from '../ui/theme';
import { formatTime } from '../lib/dates';
import { ensurePermission } from '../lib/notify';
import { exportBackup, pickBackup } from '../lib/backup';

function Item({ icon, title, subtitle, right, onPress, last }: { icon: IconName; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.item, !last && st.line, pressed && onPress && { backgroundColor: colors.surfaceAlt }]}>
      <View style={st.iconBox}>
        <Icon name={icon} size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{title}</Text>
        {!!subtitle && <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

export function SettingsScreen() {
  const { data, updateSettings, replaceAll } = useStore();
  const snack = useSnack();
  const { reminderOn, reminderHour, reminderMinute, name } = data.settings;
  const [iosTime, setIosTime] = useState(false);
  const [nameDraft, setNameDraft] = useState(name ?? '');

  const at = new Date();
  at.setHours(reminderHour, reminderMinute, 0, 0);

  const toggleReminder = async (on: boolean) => {
    if (on) {
      const ok = await ensurePermission();
      if (!ok) {
        Alert.alert('Notifications are off', 'Allow notifications for this app in your phone settings to get the daily reminder.');
        return;
      }
    }
    updateSettings({ reminderOn: on });
  };

  const pickTime = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: at,
        mode: 'time',
        is24Hour: false,
        onChange: (e, d) => {
          if (e.type === 'set' && d) updateSettings({ reminderHour: d.getHours(), reminderMinute: d.getMinutes() });
        },
      });
    } else setIosTime((v) => !v);
  };

  const doExport = async () => {
    try {
      await exportBackup(data);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const doImport = async () => {
    try {
      const next = await pickBackup();
      if (!next) return;
      Alert.alert(
        'Replace current data?',
        `This backup has ${next.tasks.length} tasks and ${next.routines.length} routines. Everything currently in the app will be replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              const prev = data;
              replaceAll(next);
              snack.show('Backup restored', () => replaceAll(prev));
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const doneCount = data.tasks.filter((t) => t.status === 'done').length;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
      <Text style={[type.display, { paddingHorizontal: space.xs, marginTop: space.sm }]}>Settings</Text>

      <SectionHeader title="You" />
      <Card>
        <View style={[st.item]}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={() => updateSettings({ name: nameDraft.trim() || undefined })}
            onSubmitEditing={() => updateSettings({ name: nameDraft.trim() || undefined })}
            placeholder="Your name (for the greeting)"
            placeholderTextColor={colors.muted}
            style={[type.body, { flex: 1, paddingVertical: 4 }]}
            maxLength={30}
            returnKeyType="done"
          />
        </View>
      </Card>

      <SectionHeader title="Reminder" />
      <Card>
        <Item
          icon="bell"
          title="Daily reminder"
          subtitle="One nudge a day with your pending count"
          right={
            <Switch value={reminderOn} onValueChange={toggleReminder} trackColor={{ true: colors.accent, false: colors.line }} thumbColor={colors.surface} />
          }
          last={!reminderOn}
        />
        {reminderOn && (
          <Item icon="today" title="Time" subtitle="Tap to change" right={<Text style={[type.body, { fontWeight: '700', color: colors.accent }]}>{formatTime(reminderHour, reminderMinute)}</Text>} onPress={pickTime} last />
        )}
      </Card>
      {iosTime && Platform.OS === 'ios' && (
        <DateTimePicker value={at} mode="time" display="spinner" onChange={(_, d) => d && updateSettings({ reminderHour: d.getHours(), reminderMinute: d.getMinutes() })} />
      )}

      <SectionHeader title="Backup" />
      <Card>
        <Item icon="upload" title="Export backup" subtitle="Save a file to Drive, Files or send to yourself" onPress={doExport} />
        <Item icon="download" title="Import backup" subtitle="Restore from a backup file" onPress={doImport} last />
      </Card>
      <Text style={[type.small, { paddingHorizontal: space.xs, marginTop: space.sm }]}>
        Your data stays on this phone. Export a backup now and then so a reset or new phone doesn't lose it.
      </Text>

      <SectionHeader title="About" />
      <Card>
        <Item icon="check" title="Daily Tasks" subtitle={`Version 1.0 · ${doneCount} tasks completed · ${data.routines.length} routines`} last />
      </Card>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 60 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
