import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAudioStore } from '../store/audioStore';

interface Props {
  onPress?: () => void;
}

export function BluetoothIndicator({ onPress }: Props) {
  const { connectedDevices } = useAudioStore();
  const connected = connectedDevices.filter((d) => d.connected);
  const hasDevices = connected.length > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={hasDevices ? 'bluetooth' : 'bluetooth-outline'}
        size={20}
        color={hasDevices ? COLORS.secondary : COLORS.textDisabled}
      />
      {hasDevices && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{connected.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SIZES.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: FONTS.weight.bold,
  },
});
