import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAudioStore } from '../store/audioStore';
import { useProfileStore } from '../store/profileStore';
import { useDiaryStore } from '../store/diaryStore';
import { CircularVisualizer } from '../components/CircularVisualizer';
import { VolumeSlider } from '../components/VolumeSlider';
import { audioEngine } from '../services/AudioEngine';
import { bluetoothService } from '../services/BluetoothService';

export default function HomeScreen() {
  const {
    isRunning, micSource, audioOutput, sonikaClean, conversationMode,
    amplification, volumeLevel, leftEQ, rightEQ, leftVolume, rightVolume,
    stereoBalance, monoMode, monoChannel,
    togglePower, toggleSonikaClean,
    setVolumeLevel, setLeftVolume, setRightVolume, setConnectedDevices,
    connectedDevices,
  } = useAudioStore();

  const { getActiveProfile } = useProfileStore();
  const { entries, startSession, endSession } = useDiaryStore();
  const navigation = useNavigation();

  useEffect(() => {
    audioEngine.onVolumeLevel((level) => setVolumeLevel(level));
    return () => { audioEngine.onVolumeLevel(() => {}); };
  }, []);

  useEffect(() => {
    if (!isRunning) setVolumeLevel(0);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    audioEngine.updateSettings({ sonikaClean, conversationMode, micSource, audioOutput });
  }, [sonikaClean, conversationMode, micSource, audioOutput, isRunning]);

  useEffect(() => {
    if (isRunning) activateKeepAwakeAsync();
    else deactivateKeepAwake();
  }, [isRunning]);

  useEffect(() => {
    const unsub = bluetoothService.onDevicesChanged(setConnectedDevices);
    bluetoothService.startScan();
    return () => { unsub(); bluetoothService.stopScan(); };
  }, []);

  const handlePowerToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!isRunning) {
      try {
        await audioEngine.start({
          micSource, audioOutput, leftEQ, rightEQ,
          leftVolume, rightVolume, amplification,
          stereoBalance, sonikaClean, conversationMode,
          monoMode, monoChannel,
        });
        const profile = getActiveProfile();
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
      amplification, stereoBalance, sonikaClean, conversationMode, monoMode, monoChannel,
      getActiveProfile, startSession, endSession]);

  const handleVolumeChange = useCallback((v: number) => {
    setLeftVolume(v);
    setRightVolume(v);
    if (isRunning) audioEngine.updateSettings({ leftVolume: v, rightVolume: v });
  }, [isRunning]);

  const handleAICleanChange = useCallback((v: number) => {
    const shouldBeActive = v > 0.4;
    if (shouldBeActive !== sonikaClean) toggleSonikaClean();
    if (isRunning) audioEngine.updateSettings({ sonikaClean: shouldBeActive });
  }, [sonikaClean, isRunning]);

  const primaryDevice = connectedDevices.find((d) => d.connected) ?? null;

  const totalSessions = entries.length;
  const totalMinutes  = entries.reduce((acc, e) => acc + (e.duration ?? 0), 0);
  const totalHours    = (totalMinutes / 60).toFixed(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <Text style={styles.logo}>Sonika</Text>
              <Ionicons name="pulse" size={16} color={COLORS.cyan} style={styles.logoIcon} />
            </View>
            <Text style={styles.subtitle}>AI Audio Amplification</Text>
          </View>
          <View style={styles.headerRight}>
            {isRunning && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Circular Visualizer ── */}
        <View style={styles.visualizerSection}>
          <CircularVisualizer
            isActive={isRunning}
            volumeLevel={volumeLevel}
            onPress={handlePowerToggle}
          />
          <Text style={styles.tapHint}>
            {isRunning ? 'Tocca per spegnere' : 'Tocca per accendere'}
          </Text>
        </View>

        {/* ── Sliders ── */}
        <View style={styles.card}>
          <VolumeSlider
            label="Volume"
            value={leftVolume}
            onValueChange={handleVolumeChange}
            color={COLORS.cyan}
          />
          <VolumeSlider
            label="AI Clean"
            value={sonikaClean ? 0.7 : 0}
            onValueChange={handleAICleanChange}
            color={COLORS.primary}
            suffix={sonikaClean ? 'Active' : 'Off'}
          />
        </View>

        {/* ── Bluetooth Card ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="headset" size={22} color={COLORS.cyan} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {primaryDevice ? 'Bluetooth Connected' : 'Bluetooth'}
              </Text>
              <Text style={styles.cardSub}>
                {primaryDevice ? primaryDevice.name : 'Nessun dispositivo connesso'}
              </Text>
            </View>
            {primaryDevice && (
              <View style={styles.connectedBadgeWrap}>
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Hearing Diary Card ── */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Diary' as never)}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Hearing Diary</Text>
              <Text style={styles.cardSub}>
                Sessions: {totalSessions} | Hours: {totalHours}
              </Text>
            </View>
            <View style={styles.cardRowRight}>
              <Ionicons name="pulse-outline" size={22} color={COLORS.primary} />
              <Text style={styles.viewLog}>View Log</Text>
            </View>
          </View>
        </TouchableOpacity>

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
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  // Header
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
  },
  logo: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoIcon: {
    marginLeft: 6,
    marginTop: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '25',
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
    fontWeight: '700',
    letterSpacing: 1,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Visualizer
  visualizerSection: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  tapHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginTop: SIZES.md,
  },

  // Cards
  card: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cyan + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  connectedBadgeWrap: {
    backgroundColor: COLORS.success + '20',
    borderRadius: SIZES.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.success + '50',
  },
  connectedText: {
    color: COLORS.success,
    fontSize: FONTS.size.xs,
    fontWeight: '600',
  },
  cardRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  viewLog: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },

  spacer: { height: SIZES.lg },
});
