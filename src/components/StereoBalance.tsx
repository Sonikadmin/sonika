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

const TRACK_WIDTH = 260;
const THUMB_SIZE = 28;

function balanceToPos(balance: number): number {
  return ((balance + 1) / 2) * TRACK_WIDTH;
}

function posToBalance(pos: number): number {
  const raw = (pos / TRACK_WIDTH) * 2 - 1;
  return Math.round(clamp(raw, -1, 1) * 10) / 10;
}

interface Props {
  value: number;
  onChange: (val: number) => void;
}

export function StereoBalance({ value, onChange }: Props) {
  const startX = useSharedValue(0);
  const position = useSharedValue(balanceToPos(value));

  const gesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = position.value;
    })
    .onUpdate((e) => {
      const newPos = clamp(startX.value + e.translationX, 0, TRACK_WIDTH);
      position.value = newPos;
      runOnJS(onChange)(posToBalance(newPos));
    });

  const thumbStyle = useAnimatedStyle(() => ({
    left: position.value - THUMB_SIZE / 2,
  }));

  const leftFillStyle = useAnimatedStyle(() => ({
    width: position.value,
  }));

  const balance = posToBalance(position.value);
  const balanceLabel =
    balance === 0 ? 'Centro' : balance < 0 ? `Sinistra ${Math.abs(balance * 100).toFixed(0)}%` : `Destra ${(balance * 100).toFixed(0)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Bilanciamento stereo</Text>
        <Text style={styles.value}>{balanceLabel}</Text>
      </View>
      <View style={styles.trackContainer}>
        <Text style={styles.side}>L</Text>
        <View style={[styles.trackWrapper, { width: TRACK_WIDTH }]}>
          <View style={styles.track}>
            <Animated.View style={[styles.leftFill, leftFillStyle]} />
          </View>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.thumb, thumbStyle]} />
          </GestureDetector>
        </View>
        <Text style={styles.side}>R</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          position.value = balanceToPos(0);
          onChange(0);
        }}
        style={styles.resetBtn}
      >
        <Text style={styles.resetText}>Reset Centro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  label: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
  },
  value: {
    color: COLORS.secondary,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  trackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  trackWrapper: {
    height: THUMB_SIZE,
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  leftFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  side: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    width: 16,
    textAlign: 'center',
  },
  resetBtn: {
    alignSelf: 'center',
    marginTop: SIZES.sm,
  },
  resetText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textDecorationLine: 'underline',
  },
});
