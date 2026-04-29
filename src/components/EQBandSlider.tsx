import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { clamp } from '../utils/audio';

const TRACK_HEIGHT = 140;
const THUMB_SIZE = 22;
const MIN_DB = -12;
const MAX_DB = 12;

function dbToPosition(db: number): number {
  return ((MAX_DB - db) / (MAX_DB - MIN_DB)) * TRACK_HEIGHT;
}

function positionToDb(pos: number): number {
  const db = MAX_DB - (pos / TRACK_HEIGHT) * (MAX_DB - MIN_DB);
  return Math.round(clamp(db, MIN_DB, MAX_DB) * 2) / 2;
}

interface Props {
  band: { id: string; frequency: number; gain: number; label: string };
  onChange: (id: string, gain: number) => void;
  color?: string;
}

export function EQBandSlider({ band, onChange, color = COLORS.primary }: Props) {
  const startY = useSharedValue(0);
  const position = useSharedValue(dbToPosition(band.gain));
  const displayDb = useSharedValue(band.gain);

  const clampedPos = (val: number) => clamp(val, 0, TRACK_HEIGHT);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      startY.value = position.value;
    })
    .onUpdate((e) => {
      const newPos = clampedPos(startY.value + e.translationY);
      position.value = newPos;
      displayDb.value = positionToDb(newPos);
      runOnJS(onChange)(band.id, positionToDb(newPos));
    });

  const thumbStyle = useAnimatedStyle(() => ({
    top: position.value - THUMB_SIZE / 2,
  }));

  const fillStyle = useAnimatedStyle(() => {
    const center = TRACK_HEIGHT / 2;
    const pos = position.value;
    return {
      top: Math.min(pos, center),
      height: Math.abs(pos - center),
    };
  });

  const dbValue = positionToDb(position.value);

  return (
    <View style={styles.container}>
      <Text style={[styles.dbLabel, { color: dbValue > 0 ? color : COLORS.textMuted }]}>
        {dbValue > 0 ? `+${dbValue}` : dbValue}
      </Text>

      <View style={styles.trackWrapper}>
        <View style={styles.track}>
          <View style={styles.centerLine} />
          <Animated.View style={[styles.fill, { backgroundColor: color + '99' }, fillStyle]} />
        </View>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.thumb, { backgroundColor: color }, thumbStyle]} />
        </GestureDetector>
      </View>

      <Text style={styles.freqLabel}>{band.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 52,
  },
  dbLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    marginBottom: SIZES.xs,
    minHeight: 14,
  },
  trackWrapper: {
    height: TRACK_HEIGHT,
    width: THUMB_SIZE,
    alignItems: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -2,
    width: 4,
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    top: TRACK_HEIGHT / 2 - 1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.textMuted,
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  freqLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
});
