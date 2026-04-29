import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface Props {
  isOn: boolean;
  onPress: () => void;
}

export function PowerButton({ isOn, onPress }: Props) {
  const glowOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isOn) {
      glowOpacity.value = withRepeat(
        withTiming(0.6, { duration: 1600 }),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [isOn]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.4 + glowOpacity.value * 0.2 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.92, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.wrapper}>
      <Animated.View
        style={[
          styles.glow,
          { backgroundColor: isOn ? COLORS.primary : 'transparent' },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.button,
          isOn ? styles.buttonOn : styles.buttonOff,
          buttonStyle,
          isOn ? SHADOWS.glow(COLORS.primary) : SHADOWS.medium,
        ]}
      >
        <Ionicons name="power" size={52} color={isOn ? COLORS.white : COLORS.textDisabled} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  glow: {
    position: 'absolute',
    width: SIZES.powerButton + 24,
    height: SIZES.powerButton + 24,
    borderRadius: (SIZES.powerButton + 24) / 2,
  },
  button: {
    width: SIZES.powerButton,
    height: SIZES.powerButton,
    borderRadius: SIZES.powerButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  buttonOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  buttonOff: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
});
