import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { haptic, motionOff } from '../ui/motion';
import { useStore } from '../state/Store';
import { Card, CarryBadge, Empty, Fab, Ring, Row, SectionHeader } from '../ui/components';
import { Icon } from '../ui/Icon';
import { colors, radius, space, type } from '../ui/theme';
import { DateKey, WEEKDAYS_LETTER, longLabel, monthName, toKey } from '../lib/dates';
import { carriedDays, dayView, routineDoneOn } from '../lib/logic';
import { EditTarget } from './EditSheet';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

function monthGrid(year: number, month: number): (DateKey | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (DateKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= count; d++) cells.push(toKey(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function Tag({ label, color, ink }: { label: string; color: string; ink: string }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: ink }}>{label}</Text>
    </View>
  );
}

function HistoryRow({ title, tag, last }: { title: string; tag: React.ReactNode; last?: boolean }) {
  return (
    <View style={[st.hrow, !last && st.hline]}>
      <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>{title}</Text>
      {tag}
    </View>
  );
}

function DayCell({ selected, children }: { selected: boolean; children: React.ReactNode }) {
  const sc = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!selected || motionOff()) return;
    sc.setValue(0.82);
    Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }, [selected, sc]);
  return <Animated.View style={{ transform: [{ scale: sc }] }}>{children}</Animated.View>;
}

export function CalendarScreen({ onEdit }: { onEdit: (t: EditTarget) => void }) {
  const store = useStore();
  const { data, today } = store;
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<DateKey>(today);

  const cells = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const stats = useMemo(() => {
    const map: Record<string, { planned: number; completed: number; tasks: number }> = {};
    let planned = 0;
    let completed = 0;
    for (const c of cells) {
      if (!c) continue;
      const v = dayView(data, c, today);
      map[c] = { planned: v.planned, completed: v.completed, tasks: v.pending.length };
      if (c <= today) {
        planned += v.planned;
        completed += v.completed;
      }
    }
    return { map, planned, completed };
  }, [cells, data, today]);

  const v = useMemo(() => dayView(data, selected, today), [data, selected, today]);

  const slide = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);
  useEffect(() => {
    if (motionOff()) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [ym, slide]);
  const gridAnim = {
    opacity: slide,
    transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [dir.current * 36, 0] }) }],
  };

  const shift = (delta: number) => {
    haptic.tick();
    dir.current = delta;
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goToday = () => {
    setYm({ y: now.getFullYear(), m: now.getMonth() });
    setSelected(today);
  };

  const isPast = v.kind === 'past';
  const empty = v.planned === 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <View style={st.monthBar}>
          <Pressable onPress={() => shift(-1)} hitSlop={12} style={st.navBtn} accessibilityLabel="Previous month">
            <Icon name="left" />
          </Pressable>
          <Pressable onPress={goToday} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={type.title}>{monthName(ym.m)} {ym.y}</Text>
            {stats.planned > 0 && (
              <Text style={type.small}>
                {stats.completed} of {stats.planned} done so far
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => shift(1)} hitSlop={12} style={st.navBtn} accessibilityLabel="Next month">
            <Icon name="right" />
          </Pressable>
        </View>

        <Card style={{ padding: space.sm }}>
          <View style={st.week}>
            {ORDER.map((d) => (
              <Text key={d} style={[type.label, st.weekLabel]}>{WEEKDAYS_LETTER[d]}</Text>
            ))}
          </View>
          <Animated.View style={[st.grid, gridAnim]}>
            {cells.map((c, i) => {
              if (!c) return <View key={`e${i}`} style={st.cell} />;
              const s = stats.map[c];
              const isToday = c === today;
              const isSel = c === selected;
              const future = c > today;
              const dayNum = Number(c.slice(8));
              return (
                <Pressable key={c} style={st.cell} onPress={() => { haptic.tick(); setSelected(c); }} accessibilityLabel={longLabel(c)}>
                  <DayCell selected={isSel}>
                  <View style={[st.cellInner, isSel && st.cellSel]}>
                    {s.planned > 0 && !future && (
                      <View style={StyleSheet.absoluteFill}>
                        <View style={st.ringWrap}>
                          <Ring value={s.completed} total={s.planned} size={38} stroke={3} showText={false} muted={future} />
                        </View>
                      </View>
                    )}
                    <Text
                      style={[
                        st.dayNum,
                        future && { color: colors.inkSoft },
                        isToday && { color: colors.accent, fontWeight: '800' },
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </View>
                  </DayCell>
                  {isToday && <View style={st.todayDot} />}
                  {future && s.tasks > 0 && <View style={[st.todayDot, { backgroundColor: colors.warnInk }]} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </Card>

        <View key={selected}>
        <View style={st.dayHeader}>
          <View style={{ flex: 1 }}>
            <Text style={type.title}>{selected === today ? 'Today' : longLabel(selected)}</Text>
            <Text style={type.small}>
              {empty ? 'Nothing planned' : `${v.completed} of ${v.planned} done`}
            </Text>
          </View>
          {!empty && <Ring value={v.completed} total={v.planned} size={48} stroke={5} />}
        </View>

        {empty && (
          <Card>
            <Empty title={isPast ? 'No tasks this day' : 'Free day'} body={isPast ? undefined : 'Tap + to plan something for this day.'} />
          </Card>
        )}

        {/* Routines: checkable on any day up to today (catch up a missed tick). */}
        {v.routinesDue.length > 0 && (
          <>
            <SectionHeader title="Routines" count={v.routinesDue.length} />
            <Card>
              {v.routinesDue.map((r, i) => {
                const done = routineDoneOn(r, selected);
                return v.kind === 'future' ? (
                  <HistoryRow key={r.id} title={r.title} tag={<Tag label="Planned" color={colors.surfaceAlt} ink={colors.inkSoft} />} last={i === v.routinesDue.length - 1} />
                ) : (
                  <Row
                    key={r.id}
                    roundCheck={false}
                    checked={done}
                    strike={done}
                    onToggle={() => store.toggleRoutine(r.id, selected)}
                    title={r.title}
                    right={isPast && !done ? <Tag label="Missed" color={colors.surfaceAlt} ink={colors.muted} /> : undefined}
                    last={i === v.routinesDue.length - 1}
                  />
                );
              })}
            </Card>
          </>
        )}

        {v.pending.length > 0 && (
          <>
            <SectionHeader title="Planned" count={v.pending.length} />
            <Card>
              {v.pending.map((t, i) => (
                <Row
                  key={t.id}
                  checked={false}
                  onToggle={() => store.toggleTask(t.id)}
                  onPress={() => onEdit({ kind: 'task', task: t })}
                  title={t.title}
                  subtitle={t.note}
                  right={<CarryBadge days={carriedDays(t)} />}
                  last={i === v.pending.length - 1}
                />
              ))}
            </Card>
          </>
        )}

        {v.done.length > 0 && (
          <>
            <SectionHeader title="Done" count={v.done.length} />
            <Card>
              {v.done.map((t, i) => (
                <HistoryRow key={t.id} title={t.title} tag={<Tag label="Done" color={colors.accentSoft} ink={colors.accent} />} last={i === v.done.length - 1} />
              ))}
            </Card>
          </>
        )}

        {v.carried.length > 0 && (
          <>
            <SectionHeader title="Carried over" count={v.carried.length} />
            <Card>
              {v.carried.map((t, i) => (
                <HistoryRow
                  key={t.id}
                  title={t.title}
                  tag={
                    t.status === 'done' ? (
                      <Tag label="Done later" color={colors.accentSoft} ink={colors.accent} />
                    ) : t.status === 'letgo' ? (
                      <Tag label="Let go" color={colors.surfaceAlt} ink={colors.muted} />
                    ) : (
                      <Tag label="Still open" color={colors.warn} ink={colors.warnInk} />
                    )
                  }
                  last={i === v.carried.length - 1}
                />
              ))}
            </Card>
          </>
        )}

        {v.letGo.length > 0 && (
          <>
            <SectionHeader title="Let go" count={v.letGo.length} />
            <Card>
              {v.letGo.map((t, i) => (
                <HistoryRow key={t.id} title={t.title} tag={<Tag label="Let go" color={colors.surfaceAlt} ink={colors.muted} />} last={i === v.letGo.length - 1} />
              ))}
            </Card>
          </>
        )}

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      {!isPast && <Fab onPress={() => onEdit({ kind: 'new', date: selected })} />}
    </View>
  );
}

const st = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  week: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', paddingVertical: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cellSel: { backgroundColor: colors.surfaceAlt },
  ringWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 15, fontWeight: '600', color: colors.ink },
  todayDot: { position: 'absolute', bottom: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.xs, paddingHorizontal: space.xs },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 52 },
  hline: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
