import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { clamp } from '../utils/audio';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = SCREEN_WIDTH - 80; // 16 screen + 20 card padding each side
const THUMB = 22;

interface Props {
  label: string;
  value: number;
  onValueChange: (val: number) => void;
  color?: string;
  suffix?: string;
}

export function VolumeSlider({
  label,
  value,
  onValueChange,
  color = COLORS.primary,
  suffix,
}: Props) {
  const startX  = useSharedValue(0);
  const position = useSharedValue(value * TRACK_WIDTH);

  const gesture = Gesture.Pan()
    .onBegin(() => { startX.value = position.value; })
    .onUpdate((e) => {
      const newPos = clamp(startX.value + e.translationX, 0, TRACK_WIDTH);
      position.value = newPos;
      runOnJS(onValueChange)(Math.round((newPos / TRACK_WIDTH) * 100) / 100);
    });

  const thumbStyle = useAnimatedStyle(() => ({ left: position.value - THUMB / 2 }));
  const fillStyle  = useAnimatedStyle(() => ({ width: position.value }));

  const pct = Math.round(value * 100);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.valueText, { color }]}>
          {pct}%{suffix ? ` ${suffix}` : ''}
        </Text>
      </View>
      <View style={[styles.trackWrapper, { width: TRACK_WIDTH }]}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
        </View>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.thumb, { backgroundColor: color }, thumbStyle]} />
        </GestureDetector>
      </View>
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
    height: THUMB,
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.9,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
});
