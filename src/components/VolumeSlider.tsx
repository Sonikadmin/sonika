import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { clamp } from '../utils/audio';

const TRACK_WIDTH = 240;
const THUMB = 22;

interface Props {
  label: string;
  value: number;
  onValueChange: (val: number) => void;
  color?: string;
}

export function VolumeSlider({ label, value, onValueChange, color = COLORS.primary }: Props) {
  const startX = useSharedValue(0);
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

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{Math.round(value * 100)}%</Text>
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
  container: { marginBottom: SIZES.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  label: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
  },
  value: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  trackWrapper: {
    height: THUMB,
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
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
