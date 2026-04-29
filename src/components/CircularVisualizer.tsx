import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { WaveformVisualizer } from './WaveformVisualizer';
import { COLORS } from '../constants/theme';

interface Props {
  isActive: boolean;
  volumeLevel: number;
  onPress: () => void;
}

const SIZE = 240;
const R    = SIZE / 2 - 6;

export function CircularVisualizer({ isActive, volumeLevel, onPress }: Props) {
  const pulse = useSharedValue(0.4);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      scale.value = withRepeat(
        withTiming(1.03, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(0.35, { duration: 600 });
      scale.value = withTiming(1, { duration: 400 });
    }
  }, [isActive]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[styles.outer, scaleStyle]}>
        {/* Inner circle with clipped waveform */}
        <View style={styles.inner}>
          <WaveformVisualizer isActive={isActive} volumeLevel={volumeLevel} />
        </View>

        {/* SVG ring: glow layers + gradient stroke */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={COLORS.cyan}    stopOpacity="1" />
                <Stop offset="1" stopColor={COLORS.primary} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            {/* Wide soft glow */}
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.cyan} strokeWidth={18} fill="none" opacity={0.06} />
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.cyan} strokeWidth={8}  fill="none" opacity={0.12} />
            {/* Main ring */}
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="url(#ringGrad)" strokeWidth={2.5} fill="none" />
            {/* Inner decorative ring */}
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R - 14} stroke={COLORS.primary} strokeWidth={0.8} fill="none" opacity={0.3} />
          </Svg>
        </View>

        {/* Animated border glow (Android elevation + iOS shadow) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.glowBorder, glowStyle]} pointerEvents="none" />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: SIZE - 12,
    height: SIZE - 12,
    borderRadius: (SIZE - 12) / 2,
    backgroundColor: '#090C22',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBorder: {
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
});
