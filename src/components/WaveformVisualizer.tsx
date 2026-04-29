import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

interface Props {
  isActive: boolean;
  volumeLevel: number;
}

const NUM_BARS = 28;

function Bar({ index, isActive, volumeLevel }: { index: number; isActive: boolean; volumeLevel: number }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isActive) {
      const center = NUM_BARS / 2;
      const dist = Math.abs(index - center) / center;
      const baseHeight = 8 + (1 - dist) * 28;
      const maxHeight = baseHeight + volumeLevel * 40;
      const duration = 400 + Math.random() * 400;
      height.value = withDelay(
        index * 15,
        withRepeat(
          withTiming(maxHeight, { duration, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(4, { duration: 300 });
    }
  }, [isActive, volumeLevel]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

export function WaveformVisualizer({ isActive, volumeLevel }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <Bar key={i} index={i} isActive={isActive} volumeLevel={volumeLevel} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    gap: 3,
    paddingHorizontal: 16,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.waveform,
    opacity: 0.85,
  },
});
