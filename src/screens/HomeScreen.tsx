import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useAudioStore } from '../store/audioStore';
import { useProfileStore } from '../store/profileStore';
import { useSettingsStore } from '../store/settingsStore';
import { useDiaryStore } from '../store/diaryStore';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { PowerButton } from '../components/PowerButton';
import { BluetoothIndicator } from '../components/BluetoothIndicator';
import { SourceSelector } from '../components/SourceSelector';
import { OutputSelector } from '../components/OutputSelector';
import { SonikaCleanButton } from '../components/SonikaCleanButton';
import { ConversationModeButton } from '../components/ConversationModeButton';
import { ProfileCarousel } from '../components/ProfileCarousel';
import { audioEngine } from '../services/AudioEngine';
import { bluetoothService } from '../services/BluetoothService';

export default function HomeScreen() {
  const {
    isRunning, micSource, audioOutput, sonikaClean, conversationMode,
    amplification, volumeLevel, leftEQ, rightEQ, leftVolume, rightVolume,
    stereoBalance, monoMode, monoChannel,
    togglePower, setMicSource, setAudioOutput, toggleSonikaClean,
    toggleConversationMode, setVolumeLevel, setConnectedDevices,
  } = useAudioStore();

  const { activeProfileId, getActiveProfile } = useProfileStore();
  const { settings } = useSettingsStore();
  const { startSession, endSession } = useDiaryStore();

  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wire volume level from native engine → waveform visualizer
  useEffect(() => {
    audioEngine.onVolumeLevel((level) => {
      setVolumeLevel(level);
    });
    return () => {
      audioEngine.onVolumeLevel(() => {});
    };
  }, []);

  // Clear volume indicator when engine stops
  useEffect(() => {
    if (!isRunning) setVolumeLevel(0);
  }, [isRunning]);

  // Push settings changes to native engine while running
  useEffect(() => {
    if (!isRunning) return;
    audioEngine.updateSettings({
      sonikaClean, conversationMode, micSource, audioOutput,
    });
  }, [sonikaClean, conversationMode, micSource, audioOutput, isRunning]);

  // Keep screen awake while running
  useEffect(() => {
    if (isRunning) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [isRunning]);

  // Bluetooth device scan on mount
  useEffect(() => {
    const unsubscribe = bluetoothService.onDevicesChanged((devices) => {
      setConnectedDevices(devices);
    });
    bluetoothService.startScan();
    return () => {
      unsubscribe();
      bluetoothService.stopScan();
    };
  }, []);

  const handlePowerToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const profile = getActiveProfile();
    if (!isRunning) {
      try {
        await audioEngine.start({
          micSource, audioOutput, leftEQ, rightEQ,
          leftVolume, rightVolume, amplification,
          stereoBalance, sonikaClean, conversationMode,
          monoMode, monoChannel,
        });
        if (profile) startSession(profile.id, profile.name);
        togglePower();
      } catch (e: any) {
        Alert.alert('Errore', e.message ?? 'Impossibile avviare il microfono');
      }
    } else {
      await audioEngine.stop();
      endSession();
      togglePower();
    }
  }, [isRunning, micSource, audioOutput, leftEQ, rightEQ, leftVolume, rightVolume,
      amplification, stereoBalance, sonikaClean, conversationMode, monoMode, monoChannel]);

  const activeProfile = getActiveProfile();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logo}>Sonika</Text>
            {isRunning && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <BluetoothIndicator />
        </View>

        {/* Active profile indicator */}
        {activeProfile && (
          <Text style={styles.profileLabel}>
            {activeProfile.icon} {activeProfile.name} · {amplification}x
          </Text>
        )}

        {/* Waveform visualizer */}
        <View style={styles.waveformCard}>
          <WaveformVisualizer isActive={isRunning} volumeLevel={volumeLevel} />
        </View>

        {/* Power button */}
        <PowerButton isOn={isRunning} onPress={handlePowerToggle} />

        <Text style={styles.statusText}>
          {isRunning ? 'Tocca per spegnere' : 'Tocca per accendere'}
        </Text>

        {/* Mic source */}
        <SourceSelector selected={micSource} onChange={setMicSource} />

        {/* Output selector */}
        <OutputSelector selected={audioOutput} onChange={setAudioOutput} />

        {/* Function buttons */}
        <View style={styles.functionRow}>
          <SonikaCleanButton active={sonikaClean} onPress={toggleSonikaClean} />
          <ConversationModeButton active={conversationMode} onPress={toggleConversationMode} />
        </View>

        {/* Mono mode quick toggle */}
        <View style={styles.monoRow}>
          <TouchableOpacity
            style={[styles.monoBtn, monoMode && styles.monoBtnActive]}
            onPress={() => useAudioStore.getState().setMonoMode(!monoMode, monoChannel)}
          >
            <Text style={styles.monoBtnText}>
              {monoMode ? `👂 Mono (${monoChannel === 'left' ? 'Sin' : 'Des'})` : '👂 Udito Unilaterale'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile carousel */}
        <ProfileCarousel />

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  logo: {
    color: COLORS.text,
    fontSize: FONTS.size.xxxl,
    fontWeight: FONTS.weight.heavy,
    letterSpacing: -1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '33',
    borderRadius: SIZES.borderRadius.full,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  liveText: {
    color: COLORS.error,
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    letterSpacing: 1,
  },
  profileLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  waveformCard: {
    marginHorizontal: SIZES.lg,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
    marginTop: SIZES.xs,
    marginBottom: SIZES.sm,
  },
  functionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.md,
    marginTop: SIZES.md,
    paddingHorizontal: SIZES.lg,
    flexWrap: 'wrap',
  },
  monoRow: {
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    alignItems: 'center',
  },
  monoBtn: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadius.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monoBtnActive: {
    backgroundColor: COLORS.warning + '22',
    borderColor: COLORS.warning,
  },
  monoBtnText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
  },
  spacer: {
    height: SIZES.lg,
  },
});
