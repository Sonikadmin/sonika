import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

interface Props {
  active: boolean;
  onPress: () => void;
}

export function ConversationModeButton({ active, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.btn,
        active ? styles.btnActive : styles.btnInactive,
        active && SHADOWS.glow(COLORS.conversationActive),
      ]}
    >
      <Text style={styles.icon}>🗣️</Text>
      <Text style={[styles.label, active && styles.labelActive]}>Conversazione</Text>
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
    backgroundColor: COLORS.conversationActive + '22',
    borderColor: COLORS.conversationActive,
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
    color: COLORS.conversationActive,
  },
});
