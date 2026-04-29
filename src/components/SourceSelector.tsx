import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { MicSource } from '../types';

interface Option {
  value: MicSource;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
}

const OPTIONS: Option[] = [
  { value: 'smartphone', label: 'Smartphone', icon: 'phone-portrait-outline', emoji: '📱' },
  { value: 'bluetooth',  label: 'Mic BT',     icon: 'mic-outline',            emoji: '🎙️' },
  { value: 'combined',   label: 'Combinato',  icon: 'git-merge-outline',      emoji: '🔀' },
];

interface Props {
  selected: MicSource;
  onChange: (src: MicSource) => void;
}

export function SourceSelector({ selected, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sorgente microfono</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.btn, active && styles.btnActive]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text style={[styles.btnText, active && styles.btnTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.md,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginBottom: SIZES.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  btn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.md,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOWS.small,
  },
  btnActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
  },
  emoji: {
    fontSize: 20,
  },
  btnText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
  },
  btnTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weight.bold,
  },
});
