import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/* ---------- Reduce motion ---------- */

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => (reduceMotion = v))
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion = v));

export const motionOff = () => reduceMotion;

export function useReduceMotion() {
  const [v, setV] = useState(reduceMotion);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setV);
    AccessibilityInfo.isReduceMotionEnabled().then(setV).catch(() => {});
    return () => sub.remove();
  }, []);
  return v;
}

/* ---------- Haptics (never throw) ---------- */

const safe = (p: Promise<void>) => p.catch(() => {});
const native = Platform.OS !== 'web';

export const haptic = {
  tick: () => native && safe(Haptics.selectionAsync()),
  tap: () => native && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  done: () => native && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => native && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => native && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

/* ---------- List reflow ---------- */

export function animateLayout() {
  if (reduceMotion || Platform.OS === 'web') return;
  LayoutAnimation.configureNext({
    duration: 260,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'spring', springDamping: 0.85 },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}

/* ---------- Entrance: fade + rise, staggered by index ---------- */

export function useEntrance(index = 0, distance = 10) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 10) * 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index]);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

/** Springy press feedback for buttons and cards. */
export function usePressScale(to = 0.96) {
  const s = useRef(new Animated.Value(1)).current;
  const go = (v: number) =>
    Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 10 : 0 }).start();
  return {
    style: { transform: [{ scale: s }] },
    onPressIn: () => go(to),
    onPressOut: () => go(1),
  };
}
