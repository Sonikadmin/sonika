import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { clamp } from '../utils/audio';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = SCREEN_WIDTH - 80; // 16 screen + 20 card padding each side
const THUMB = 24;

interface Props {
  label: string;
  value: number;
  onValueChange: (val: number) => void;
  color?: string;
  gradient?: readonly [string, string];
  suffix?: string;
}

export function VolumeSlider({
  label,
  value,
  onValueChange,
  color = COLORS.primary,
  gradient,
  suffix,
}: Props) {
  const startX     = useSharedValue(0);
  const position   = useSharedValue(value * TRACK_WIDTH);
  const isDragging = useSharedValue(false);
  const pressed    = useSharedValue(0);

  // Sincronizza il thumb quando il valore cambia dall'esterno
  // (profilo applicato, stato ripristinato, canali collegati…)
  useEffect(() => {
    if (!isDragging.value) {
      position.value = withTiming(value * TRACK_WIDTH, { duration: 120 });
    }
  }, [value]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
      pressed.value = withTiming(1, { duration: 120 });
      startX.value = position.value;
    })
    .onUpdate((e) => {
      const newPos = clamp(startX.value + e.translationX, 0, TRACK_WIDTH);
      position.value = newPos;
      runOnJS(onValueChange)(Math.round((newPos / TRACK_WIDTH) * 100) / 100);
    })
    .onFinalize(() => {
      isDragging.value = false;
      pressed.value = withTiming(0, { duration: 180 });
    });

  // Tap sul track per saltare direttamente a un valore
  const tap = Gesture.Tap().onEnd((e) => {
    const newPos = clamp(e.x, 0, TRACK_WIDTH);
    position.value = withTiming(newPos, { duration: 100 });
    runOnJS(onValueChange)(Math.round((newPos / TRACK_WIDTH) * 100) / 100);
  });

  const thumbStyle = useAnimatedStyle(() => ({
    left: position.value - THUMB / 2,
    transform: [{ scale: 1 + pressed.value * 0.25 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: position.value }));

  const pct = Math.round(value * 100);
  const fillColors = gradient ?? ([color, color] as const);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.valueText, { color }]}>
          {pct}%{suffix ? ` ${suffix}` : ''}
        </Text>
      </View>
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View
          style={[styles.trackWrapper, { width: TRACK_WIDTH }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct}%` }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]}>
              <LinearGradient
                colors={fillColors}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: color, shadowColor: color },
              thumbStyle,
            ]}
          >
            <View style={styles.thumbInner} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SIZES.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  label: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
  },
  valueText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  trackWrapper: {
    height: THUMB + 8,
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    opacity: 0.9,
  },
});
