import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface Props {
  value: number;
  onChange: (val: number) => void;
}

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function AmplificationControl({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Amplificazione</Text>
        <Text style={styles.value}>{value}x</Text>
      </View>
      <View style={styles.steps}>
        {STEPS.map((step) => {
          const active = step <= value;
          const selected = step === value;
          return (
            <TouchableOpacity
              key={step}
              onPress={() => onChange(step)}
              style={[
                styles.step,
                active && styles.stepActive,
                selected && styles.stepSelected,
              ]}
            >
              <Text style={[styles.stepText, active && styles.stepTextActive]}>
                {step}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    color: COLORS.accent,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
  },
  step: {
    flex: 1,
    height: 36,
    borderRadius: SIZES.borderRadius.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: COLORS.accent + '33',
    borderColor: COLORS.accent,
  },
  stepSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stepText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
  },
  stepTextActive: {
    color: COLORS.text,
    fontWeight: FONTS.weight.bold,
  },
});
