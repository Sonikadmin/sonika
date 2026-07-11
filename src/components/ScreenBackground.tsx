import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GRADIENTS } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Sfondo cosmico condiviso da tutte le schermate:
 * gradiente blu notte → viola, con SafeArea in alto.
 */
export function ScreenBackground({ children, style }: Props) {
  return (
    <LinearGradient
      colors={GRADIENTS.background}
      locations={[0, 0.45, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={[styles.safe, style]} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
});
