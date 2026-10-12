import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../state/Store';
import { ActionSheet, Card, Empty, Fab, SectionHeader, SheetAction, useSnack } from '../ui/components';
import { colors, radius, space, type } from '../ui/theme';
import { isEnded, isPausedNow, routineDoneOn, routineDueOn, routineStreak, scheduleLabel } from '../lib/logic';
import { Routine } from '../lib/types';
import { addDays } from '../lib/dates';
import { EditTarget } from './EditSheet';
import { haptic } from '../ui/motion';

/** Done count over the last 30 due days, for a quick consistency read. */
function consistency(r: Routine, today: string) {
  let due = 0;
  let done = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    if (d < r.startDate) break;
    if (routineDueOn(r, d)) {
      due++;
      if (routineDoneOn(r, d)) done++;
    }
  }
  return { due, done };
}

export function RoutinesScreen({ onEdit }: { onEdit: (t: EditTarget) => void }) {
  const store = useStore();
  const { data, today } = store;
  const snack = useSnack();
  const [menu, setMenu] = useState<{ title: string; subtitle?: string; actions: SheetAction[] } | null>(null);

  const active = data.routines.filter((r) => !isEnded(r, today)).sort((a, b) => a.createdAt - b.createdAt);
  const ended = data.routines.filter((r) => isEnded(r, today));

  const open = (r: Routine) => {
    haptic.tick();
    const paused = isPausedNow(r);
    const finished = isEnded(r, today);
    const actions: SheetAction[] = finished
      ? []
      : [
          { label: 'Edit', onPress: () => onEdit({ kind: 'routine', routine: r }) },
          paused
            ? { label: 'Resume', onPress: () => store.resumeRoutine(r.id) }
            : { label: 'Pause', onPress: () => { store.pauseRoutine(r.id); snack.show('Routine paused', () => store.restoreRoutine(r)); } },
          { label: 'End routine', onPress: () => { store.endRoutine(r.id); snack.show('Routine ended. History kept.', () => store.restoreRoutine(r)); } },
        ];
    actions.push({
      label: 'Delete with history',
      danger: true,
      onPress: () => {
        store.deleteRoutine(r.id);
        snack.show('Routine deleted', () => store.restoreRoutine(r));
      },
    });
    setMenu({ title: r.title, subtitle: scheduleLabel(r.days), actions });
  };

  const item = (r: Routine, last: boolean) => {
    const paused = isPausedNow(r);
    const streak = routineStreak(r, today);
    const c = consistency(r, today);
    return (
      <Pressable key={r.id} onPress={() => open(r)} style={({ pressed }) => [st.item, !last && st.line, pressed && { backgroundColor: colors.surfaceAlt }]}>
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { fontWeight: '600' }, paused && { color: colors.muted }]}>{r.title}</Text>
          <Text style={[type.small, { marginTop: 2 }]}>
            {scheduleLabel(r.days)}
            {c.due > 0 ? `  ·  ${c.done}/${c.due} in 30 days` : ''}
          </Text>
        </View>
        {paused ? (
          <View style={[st.pill, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[st.pillText, { color: colors.muted }]}>Paused</Text>
          </View>
        ) : streak > 0 ? (
          <View style={[st.pill, { backgroundColor: colors.accentSoft }]}>
            <Text style={[st.pillText, { color: colors.accent }]}>{streak} day streak</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <Text style={[type.display, { paddingHorizontal: space.xs, marginTop: space.sm }]}>Routines</Text>
        <Text style={[type.small, { paddingHorizontal: space.xs, marginTop: 4 }]}>
          Routines repeat on their days and never pile up. A missed day shows in the calendar.
        </Text>

        <SectionHeader title="Active" count={active.length} />
        <Card>
          {active.length === 0 ? (
            <Empty title="No routines yet" body="Tap + to add something you do regularly, like a morning walk." />
          ) : (
            active.map((r, i) => item(r, i === active.length - 1))
          )}
        </Card>

        {ended.length > 0 && (
          <>
            <SectionHeader title="Ended" count={ended.length} />
            <Card>{ended.map((r, i) => item(r, i === ended.length - 1))}</Card>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      <Fab onPress={() => onEdit({ kind: 'new', routine: true })} />
      <ActionSheet visible={!!menu} title={menu?.title} subtitle={menu?.subtitle} actions={menu?.actions ?? []} onClose={() => setMenu(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 60 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
});
