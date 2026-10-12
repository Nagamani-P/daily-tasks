import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { haptic, motionOff } from './src/ui/motion';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/state/Store';
import { SnackProvider } from './src/ui/components';
import { Icon, IconName } from './src/ui/Icon';
import { colors } from './src/ui/theme';
import { TodayScreen } from './src/screens/TodayScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { RoutinesScreen } from './src/screens/RoutinesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { EditSheet, EditTarget } from './src/screens/EditSheet';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Tab = 'today' | 'calendar' | 'routines' | 'settings';
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'routines', label: 'Routines', icon: 'repeat' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

/** Each screen fades and rises in when its tab opens. */
function ScreenIn({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(motionOff() ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

function TabButton({ label, icon, on, onPress }: { label: string; icon: IconName; on: boolean; onPress: () => void }) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: on ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 10 }).start();
  }, [on, v]);
  return (
    <Pressable onPress={onPress} style={st.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
      <View style={st.tabIcon}>
        <Animated.View style={[StyleSheet.absoluteFill, st.pill, { opacity: v, transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]} />
        <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
          <Icon name={icon} size={22} color={on ? colors.accent : colors.muted} />
        </Animated.View>
      </View>
      <Text style={[st.tabLabel, on && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

function Shell() {
  const { ready } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const [edit, setEdit] = useState<EditTarget | null>(null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={st.root} />;

  const choose = (t: Tab) => {
    if (t === tab) return;
    haptic.tick();
    setTab(t);
  };

  return (
    <SnackProvider bottomOffset={76 + insets.bottom}>
      <View style={st.root}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <ScreenIn key={tab}>
            {tab === 'today' && <TodayScreen onEdit={setEdit} />}
            {tab === 'calendar' && <CalendarScreen onEdit={setEdit} />}
            {tab === 'routines' && <RoutinesScreen onEdit={setEdit} />}
            {tab === 'settings' && <SettingsScreen />}
          </ScreenIn>
        </SafeAreaView>

        <View style={[st.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {TABS.map((t) => (
            <TabButton key={t.key} label={t.label} icon={t.icon} on={tab === t.key} onPress={() => choose(t.key)} />
          ))}
        </View>
      </View>
      <EditSheet target={edit} onClose={() => setEdit(null)} />
    </SnackProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { paddingHorizontal: 18, paddingVertical: 4, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pill: { backgroundColor: colors.accentSoft, borderRadius: 16 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
