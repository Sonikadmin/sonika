import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { WaveformVisualizer } from './WaveformVisualizer';
import { COLORS } from '../constants/theme';

interface Props {
  isActive: boolean;
  volumeLevel: number;
  onPress: () => void;
}

const SIZE = 250;
const R    = SIZE / 2 - 8;
const ARC_R = SIZE / 2 - 2;
const ARC_LEN = 2 * Math.PI * ARC_R;

export function CircularVisualizer({ isActive, volumeLevel, onPress }: Props) {
  const pulse    = useSharedValue(0.4);
  const scale    = useSharedValue(1);
  const rotation = useSharedValue(0);
  const level    = useSharedValue(0);

  useEffect(() => {
    level.value = withTiming(volumeLevel, { duration: 120 });
  }, [volumeLevel]);

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
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, { duration: 9000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0.35, { duration: 600 });
      scale.value = withTiming(1, { duration: 400 });
      rotation.value = withTiming(rotation.value % 360, { duration: 800 });
    }
  }, [isActive]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * (0.7 + level.value * 0.5),
    shadowRadius: 14 + level.value * 14,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value + level.value * 0.02 }],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    opacity: interpolate(pulse.value, [0.35, 1], [0.25, 0.9]),
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        isActive ? 'Spegni amplificazione' : 'Accendi amplificazione'
      }
      accessibilityState={{ selected: isActive }}
    >
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
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.cyan} strokeWidth={20} fill="none" opacity={0.06} />
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.cyan} strokeWidth={9}  fill="none" opacity={0.12} />
            {/* Main ring */}
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="url(#ringGrad)" strokeWidth={2.5} fill="none" />
            {/* Inner decorative ring */}
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R - 14} stroke={COLORS.primary} strokeWidth={0.8} fill="none" opacity={0.3} />
          </Svg>
        </View>

        {/* Arco orbitale rotante (attivo = più luminoso) */}
        <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]} pointerEvents="none">
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <LinearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={COLORS.secondary} stopOpacity="0" />
                <Stop offset="1" stopColor={COLORS.cyan}      stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={ARC_R}
              stroke="url(#arcGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${ARC_LEN * 0.22} ${ARC_LEN * 0.78}`}
            />
          </Svg>
        </Animated.View>

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
    width: SIZE - 16,
    height: SIZE - 16,
    borderRadius: (SIZE - 16) / 2,
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
