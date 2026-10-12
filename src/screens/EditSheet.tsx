import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Sheet, Chip, Button } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';
import { useStore } from '../state/Store';
import { Routine, Task } from '../lib/types';
import { DateKey, WEEKDAYS_LETTER, addDays, fromKey, relativeLabel, toKey } from '../lib/dates';
import { EVERY_DAY } from '../lib/logic';
import { animateLayout, haptic } from '../ui/motion';

export type EditTarget =
  | { kind: 'new'; date?: DateKey; routine?: boolean }
  | { kind: 'task'; task: Task }
  | { kind: 'routine'; routine: Routine };

const PRESETS: { label: string; days: number[] }[] = [
  { label: 'Every day', days: EVERY_DAY },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
];
// Show weekdays Monday first.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function EditSheet({ target, onClose }: { target: EditTarget | null; onClose: () => void }) {
  const { today, addTask, updateTask, addRoutine, updateRoutine } = useStore();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [date, setDate] = useState<DateKey>(today);
  const [repeat, setRepeat] = useState(false);
  const [days, setDays] = useState<number[]>(EVERY_DAY);
  const [iosPicker, setIosPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const last = useRef<EditTarget | null>(null);
  if (target) last.current = target;

  useEffect(() => {
    if (!target) return;
    setIosPicker(false);
    if (target.kind === 'new') {
      setTitle('');
      setNote('');
      setShowNote(false);
      setDate(target.date && target.date >= today ? target.date : today);
      setRepeat(!!target.routine);
      setDays(EVERY_DAY);
    } else if (target.kind === 'task') {
      setTitle(target.task.title);
      setNote(target.task.note ?? '');
      setShowNote(!!target.task.note);
      setDate(target.task.currentDate < today ? today : target.task.currentDate);
      setRepeat(false);
    } else {
      setTitle(target.routine.title);
      setNote(target.routine.note ?? '');
      setShowNote(!!target.routine.note);
      setRepeat(true);
      setDays(target.routine.days);
    }
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [target, today]);

  const cur = last.current;
  if (!cur) return null;

  const isNew = cur.kind === 'new';
  const canSave = title.trim().length > 0 && (!repeat || days.length > 0);
  const heading = isNew ? (repeat ? 'New routine' : 'New task') : cur.kind === 'routine' ? 'Edit routine' : 'Edit task';

  const save = () => {
    if (!canSave || !target) return;
    haptic.success();
    animateLayout();
    if (cur.kind === 'routine') updateRoutine(cur.routine.id, { title, note, days });
    else if (cur.kind === 'task') updateTask(cur.task.id, { title, note, date });
    else if (repeat) addRoutine({ title, note, days });
    else addTask({ title, note, date });
    onClose();
  };

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromKey(date),
        mode: 'date',
        minimumDate: fromKey(today),
        onChange: (e, d) => {
          if (e.type === 'set' && d) setDate(toKey(d));
        },
      });
    } else {
      setIosPicker((v) => !v);
    }
  };

  const toggleDay = (d: number) => {
    haptic.tick();
    setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));
  };

  const tomorrow = addDays(today, 1);
  const isPreset = (p: number[]) => p.length === days.length && p.every((d) => days.includes(d));

  return (
    <Sheet visible={!!target} onClose={onClose}>
      <Text style={[type.title, { marginBottom: space.md }]}>{heading}</Text>

      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={setTitle}
        placeholder={repeat ? 'e.g. Morning walk' : 'What needs doing?'}
        placeholderTextColor={colors.muted}
        style={st.input}
        returnKeyType="done"
        onSubmitEditing={save}
        maxLength={140}
      />

      {showNote ? (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          placeholderTextColor={colors.muted}
          style={[st.input, st.note]}
          multiline
          maxLength={500}
        />
      ) : (
        <Pressable onPress={() => setShowNote(true)} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: space.sm }}>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add note</Text>
        </Pressable>
      )}

      {isNew && (
        <View style={st.switchRow}>
          <View>
            <Text style={[type.body, { fontWeight: '600' }]}>Repeat</Text>
            <Text style={type.small}>Make this a routine</Text>
          </View>
          <Switch
            value={repeat}
            onValueChange={(v) => {
              haptic.tick();
              animateLayout();
              setRepeat(v);
            }}
            trackColor={{ true: colors.accent, false: colors.line }}
            thumbColor={colors.surface}
          />
        </View>
      )}

      {!repeat && (
        <View style={{ marginTop: space.lg }}>
          <Text style={[type.label, { marginBottom: space.sm }]}>Date</Text>
          <View style={st.chips}>
            <Chip label="Today" active={date === today} onPress={() => setDate(today)} />
            <Chip label="Tomorrow" active={date === tomorrow} onPress={() => setDate(tomorrow)} />
            <Chip
              label={date !== today && date !== tomorrow ? relativeLabel(date, today) : 'Pick date'}
              active={date !== today && date !== tomorrow}
              onPress={pickDate}
            />
          </View>
          {iosPicker && Platform.OS === 'ios' && (
            <DateTimePicker
              value={fromKey(date)}
              mode="date"
              display="inline"
              minimumDate={fromKey(today)}
              onChange={(_, d) => d && setDate(toKey(d))}
            />
          )}
        </View>
      )}

      {repeat && (
        <View style={{ marginTop: space.lg }}>
          <Text style={[type.label, { marginBottom: space.sm }]}>Repeats on</Text>
          <View style={st.chips}>
            {PRESETS.map((p) => (
              <Chip key={p.label} label={p.label} active={isPreset(p.days)} onPress={() => setDays(p.days)} />
            ))}
          </View>
          <View style={st.week}>
            {ORDER.map((d) => {
              const on = days.includes(d);
              return (
                <Pressable key={d} onPress={() => toggleDay(d)} style={[st.day, on && st.dayOn]} accessibilityLabel={`Toggle day ${d}`}>
                  <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.inkSoft }}>{WEEKDAYS_LETTER[d]}</Text>
                </Pressable>
              );
            })}
          </View>
          {days.length === 0 && <Text style={[type.small, { color: colors.danger, marginTop: 6 }]}>Pick at least one day</Text>}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" kind="ghost" onPress={onClose} />
        </View>
        <View style={{ flex: 2 }}>
          <Button label={isNew ? 'Add' : 'Save'} onPress={save} disabled={!canSave} />
        </View>
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: space.lg, paddingVertical: 14, fontSize: 17, color: colors.ink,
  },
  note: { marginTop: space.sm, minHeight: 70, textAlignVertical: 'top', fontSize: 15 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.lg, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg, paddingVertical: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  day: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line,
  },
  dayOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
