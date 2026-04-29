import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

interface Props {
  active: boolean;
  onPress: () => void;
}

export function SonikaCleanButton({ active, onPress }: Props) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(withTiming(1.06, { duration: 1200 }), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 300 });
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.btn,
          active ? styles.btnActive : styles.btnInactive,
          animStyle,
          active && SHADOWS.glow(COLORS.sonikaCleanActive),
        ]}
      >
        <Text style={styles.icon}>✨</Text>
        <Text style={[styles.label, active && styles.labelActive]}>Sonika Clean</Text>
        <View style={[styles.dot, { backgroundColor: active ? COLORS.sonikaCleanActive : COLORS.textDisabled }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius.full,
    borderWidth: 1.5,
    gap: 6,
    ...SHADOWS.small,
  },
  btnActive: {
    backgroundColor: COLORS.sonikaCleanActive + '22',
    borderColor: COLORS.sonikaCleanActive,
  },
  btnInactive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  labelActive: {
    color: COLORS.sonikaCleanActive,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
