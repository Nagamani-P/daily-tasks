import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../state/Store';
import { ActionSheet, Card, CarryBadge, Confetti, Empty, Fab, Ring, Row, SectionHeader, SheetAction, useSnack } from '../ui/components';
import { haptic, useEntrance } from '../ui/motion';
import { Animated } from 'react-native';
import { Icon } from '../ui/Icon';
import { colors, space, type } from '../ui/theme';
import { addDays, longLabel, shortLabel } from '../lib/dates';
import { carriedDays, dayView, routineDoneOn, routineStreak, scheduleLabel } from '../lib/logic';
import { Routine, Task } from '../lib/types';
import { EditTarget } from './EditSheet';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function TodayScreen({ onEdit }: { onEdit: (t: EditTarget) => void }) {
  const store = useStore();
  const { data, today } = store;
  const snack = useSnack();
  const [showDone, setShowDone] = useState(false);
  const [menu, setMenu] = useState<{ title: string; subtitle?: string; actions: SheetAction[] } | null>(null);

  const view = useMemo(() => dayView(data, today, today), [data, today]);
  const remaining = view.planned - view.completed;

  // Celebrate the moment the day becomes fully done (not when opening an already-done day).
  const allDone = view.planned > 0 && remaining === 0;
  const prevAllDone = useRef(allDone);
  const [fireKey, setFireKey] = useState(0);
  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      const t = setTimeout(() => {
        setFireKey((k) => k + 1);
        haptic.success();
      }, 450);
      prevAllDone.current = allDone;
      return () => clearTimeout(t);
    }
    prevAllDone.current = allDone;
  }, [allDone]);
  const headerIn = useEntrance(0, 6);

  const taskMenu = (t: Task) => {
    const days = carriedDays(t);
    setMenu({
      title: t.title,
      subtitle: days > 0 ? `Planned ${shortLabel(t.originalDate)} · carried ${days} day${days === 1 ? '' : 's'}` : t.note,
      actions: [
        { label: 'Edit', onPress: () => onEdit({ kind: 'task', task: t }) },
        ...(t.status === 'pending'
          ? [
              { label: 'Move to tomorrow', onPress: () => store.updateTask(t.id, { title: t.title, note: t.note, date: addDays(today, 1) }) },
              {
                label: 'Let go',
                onPress: () => {
                  store.letGoTask(t.id);
                  snack.show('Task let go', () => store.restoreTask(t));
                },
              },
            ]
          : []),
        {
          label: 'Delete',
          danger: true,
          onPress: () => {
            store.deleteTask(t.id);
            snack.show('Task deleted', () => store.restoreTask(t));
          },
        },
      ],
    });
  };

  const routineMenu = (r: Routine) =>
    setMenu({
      title: r.title,
      subtitle: `${scheduleLabel(r.days)} · ${routineStreak(r, today)} day streak`,
      actions: [
        { label: 'Edit', onPress: () => onEdit({ kind: 'routine', routine: r }) },
        { label: 'Pause routine', onPress: () => { store.pauseRoutine(r.id); snack.show('Routine paused', () => store.restoreRoutine(r)); } },
      ],
    });

  const nothing = view.routinesDue.length === 0 && view.pending.length === 0 && view.done.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={st.content}>
        <Animated.View style={[st.header, headerIn]}>
          <View style={{ flex: 1 }}>
            <Text style={type.small}>{greeting()}{data.settings.name ? `, ${data.settings.name}` : ''}</Text>
            <Text style={[type.display, { marginTop: 2 }]}>{longLabel(today)}</Text>
            <Text style={[type.small, { marginTop: 6 }]}>
              {view.planned === 0
                ? 'Nothing planned yet'
                : remaining === 0
                  ? 'All done for today. Nice work!'
                  : `${remaining} of ${view.planned} left`}
            </Text>
          </View>
          <View>
            <Ring value={view.completed} total={view.planned} size={64} stroke={6} pulseKey={fireKey} />
            <Confetti fireKey={fireKey} originX={32} originY={32} />
          </View>
        </Animated.View>

        {nothing && (
          <Card style={{ marginTop: space.xl }} index={1}>
            <Empty title="A clear day" body="Tap + to add a task or a routine. Anything left unfinished moves to tomorrow on its own." />
          </Card>
        )}

        {view.routinesDue.length > 0 && (
          <>
            <SectionHeader title="Routines" count={view.routinesDue.length} right={<Icon name="repeat" size={16} color={colors.muted} />} />
            <Card index={1}>
              {view.routinesDue.map((r, i) => {
                const done = routineDoneOn(r, today);
                const streak = routineStreak(r, today);
                return (
                  <Row
                    key={r.id}
                    roundCheck={false}
                    checked={done}
                    strike={done}
                    onToggle={() => store.toggleRoutine(r.id, today)}
                    onPress={() => routineMenu(r)}
                    title={r.title}
                    subtitle={streak > 1 ? `${streak} day streak` : r.note}
                    last={i === view.routinesDue.length - 1}
                  />
                );
              })}
            </Card>
          </>
        )}

        {(view.pending.length > 0 || view.done.length > 0) && (
          <>
            <SectionHeader title="Tasks" count={view.pending.length} />
            <Card index={2}>
              {view.pending.length === 0 ? (
                <Empty title="All tasks done" />
              ) : (
                view.pending.map((t, i) => (
                  <Row
                    key={t.id}
                    checked={false}
                    onToggle={() => store.toggleTask(t.id)}
                    onPress={() => taskMenu(t)}
                    title={t.title}
                    subtitle={t.note}
                    right={<CarryBadge days={carriedDays(t)} />}
                    last={i === view.pending.length - 1}
                  />
                ))
              )}
            </Card>
          </>
        )}

        {view.done.length > 0 && (
          <>
            <SectionHeader
              title="Completed"
              count={view.done.length}
              onPress={() => setShowDone((v) => !v)}
              right={<Icon name={showDone ? 'chevronDown' : 'right'} size={16} color={colors.muted} />}
            />
            {showDone && (
              <Card>
                {view.done.map((t, i) => (
                  <Row
                    key={t.id}
                    checked
                    strike
                    onToggle={() => store.toggleTask(t.id)}
                    onPress={() => taskMenu(t)}
                    title={t.title}
                    subtitle={carriedDays(t) > 0 ? `Done after ${carriedDays(t)} day${carriedDays(t) === 1 ? '' : 's'} carried` : undefined}
                    last={i === view.done.length - 1}
                  />
                ))}
              </Card>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Fab onPress={() => onEdit({ kind: 'new', date: today })} />
      <ActionSheet visible={!!menu} title={menu?.title} subtitle={menu?.subtitle} actions={menu?.actions ?? []} onClose={() => setMenu(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xs, paddingTop: space.sm },
});
