import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { AudioOutput } from '../types';

interface Option {
  value: AudioOutput;
  label: string;
  emoji: string;
}

const OPTIONS: Option[] = [
  { value: 'bone_conduction',     label: 'Conduz. Ossea', emoji: '🥽' },
  { value: 'bluetooth_headphones', label: 'Cuffie BT',    emoji: '🎧' },
  { value: 'jack',                label: 'Jack Audio',    emoji: '🔌' },
];

interface Props {
  selected: AudioOutput;
  onChange: (out: AudioOutput) => void;
}

export function OutputSelector({ selected, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Output audio</Text>
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
    backgroundColor: COLORS.secondary + '22',
    borderColor: COLORS.secondary,
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
    color: COLORS.secondary,
    fontWeight: FONTS.weight.bold,
  },
});
