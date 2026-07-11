import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES, GRADIENTS } from '../constants/theme';
import { useAudioStore } from '../store/audioStore';
import { useProfileStore } from '../store/profileStore';
import { useDiaryStore } from '../store/diaryStore';
import { useSettingsStore } from '../store/settingsStore';
import { CircularVisualizer } from '../components/CircularVisualizer';
import { VolumeSlider } from '../components/VolumeSlider';
import { ScreenBackground } from '../components/ScreenBackground';
import { audioEngine } from '../services/AudioEngine';
import { bluetoothService } from '../services/BluetoothService';
import { maybePromptBatteryWhitelist } from '../services/BatteryGuard';

function GradientCard({
  children,
  onPress,
  active = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
}) {
  const inner = (
    <LinearGradient
      colors={active ? GRADIENTS.cardActive : GRADIENTS.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.card}
    >
      {children}
    </LinearGradient>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.cardWrap}>
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={styles.cardWrap}>{inner}</View>;
}

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
  const { settings } = useSettingsStore();
  const navigation = useNavigation();
  const autoStarted = useRef(false);

  useEffect(() => {
    audioEngine.onVolumeLevel((level) => setVolumeLevel(level));
    return () => { audioEngine.onVolumeLevel(() => {}); };
  }, []);

  useEffect(() => {
    if (!isRunning) setVolumeLevel(0);
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
        // "Riduzione rumore automatica": attiva AI Clean all'avvio
        const effectiveClean = sonikaClean || settings.autoNoiseReduction;
        if (effectiveClean !== sonikaClean) toggleSonikaClean();

        await audioEngine.start({
          micSource, audioOutput, leftEQ, rightEQ,
          leftVolume, rightVolume, amplification,
          stereoBalance, sonikaClean: effectiveClean, conversationMode,
          monoMode, monoChannel,
          audioQuality: settings.audioQuality,
          discreteMode: settings.discreteMode,
        });
        const profile = getActiveProfile();
        if (profile) startSession(profile.id, profile.name);
        togglePower();
        // Una tantum: suggerisci l'esclusione dall'ottimizzazione batteria
        maybePromptBatteryWhitelist();
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
      settings.audioQuality, settings.discreteMode, settings.autoNoiseReduction,
      getActiveProfile, startSession, endSession]);

  // Avvio automatico all'apertura dell'app (impostazione "Comportamento")
  useEffect(() => {
    if (settings.autoStart && !isRunning && !autoStarted.current) {
      autoStarted.current = true;
      const t = setTimeout(() => { handlePowerToggle(); }, 1200);
      return () => clearTimeout(t);
    }
  }, [settings.autoStart]);

  const handleVolumeChange = useCallback((v: number) => {
    setLeftVolume(v);
    setRightVolume(v);
  }, []);

  const handleAICleanToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSonikaClean();
  }, []);

  const activeProfile = getActiveProfile();
  const primaryDevice = connectedDevices.find((d) => d.connected) ?? null;

  const totalSessions = entries.length;
  const totalMinutes  = entries.reduce((acc, e) => acc + (e.duration ?? 0), 0);
  const totalHours    = (totalMinutes / 60).toFixed(1);

  return (
    <ScreenBackground>
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
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Settings' as never)}
              accessibilityRole="button"
              accessibilityLabel="Apri impostazioni"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
          {activeProfile && (
            <View style={styles.profileChip}>
              <Text style={styles.profileChipIcon}>{activeProfile.icon}</Text>
              <Text style={styles.profileChipText}>{activeProfile.name}</Text>
            </View>
          )}
        </View>

        {/* ── Volume + AI Clean ── */}
        <GradientCard>
          <VolumeSlider
            label="Volume"
            value={leftVolume}
            onValueChange={handleVolumeChange}
            color={COLORS.cyan}
            gradient={[GRADIENTS.primary[0], GRADIENTS.primary[1]]}
          />
          <TouchableOpacity
            style={styles.aiCleanRow}
            activeOpacity={0.7}
            onPress={handleAICleanToggle}
            accessibilityRole="switch"
            accessibilityLabel="AI Clean, riduzione rumore"
            accessibilityState={{ checked: sonikaClean }}
          >
            <View
              style={[
                styles.aiCleanIconWrap,
                sonikaClean && styles.aiCleanIconWrapActive,
              ]}
            >
              <Ionicons
                name="sparkles"
                size={20}
                color={sonikaClean ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <View style={styles.aiCleanBody}>
              <Text style={styles.aiCleanTitle}>AI Clean</Text>
              <Text style={styles.aiCleanSub}>
                {sonikaClean ? 'Riduzione rumore attiva' : 'Riduzione rumore disattivata'}
              </Text>
            </View>
            <View style={[styles.aiCleanPill, sonikaClean && styles.aiCleanPillActive]}>
              <View style={[styles.aiCleanKnob, sonikaClean && styles.aiCleanKnobActive]} />
            </View>
          </TouchableOpacity>
        </GradientCard>

        {/* ── Bluetooth Card ── */}
        <GradientCard active={!!primaryDevice}>
          <View style={styles.cardRow}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="headset" size={22} color={COLORS.cyan} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {primaryDevice ? 'Bluetooth connesso' : 'Bluetooth'}
              </Text>
              <Text style={styles.cardSub}>
                {primaryDevice ? primaryDevice.name : 'Nessun dispositivo connesso'}
              </Text>
            </View>
            {primaryDevice && (
              <View style={styles.connectedBadgeWrap}>
                <Text style={styles.connectedText}>Connesso</Text>
              </View>
            )}
          </View>
        </GradientCard>

        {/* ── Hearing Diary Card ── */}
        <GradientCard onPress={() => navigation.navigate('Diary' as never)}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIconWrap, styles.diaryIconWrap]}>
              <Ionicons name="pulse-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Diario dell'udito</Text>
              <Text style={styles.cardSub}>
                Sessioni: {totalSessions} | Ore: {totalHours}
              </Text>
            </View>
            <Text style={styles.viewLog}>Apri</Text>
          </View>
        </GradientCard>

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
    backgroundColor: COLORS.primary + '18',
    borderColor: COLORS.primary + '55',
    borderWidth: 1,
    borderRadius: SIZES.borderRadius.full,
    paddingHorizontal: SIZES.md,
    paddingVertical: 5,
    gap: 6,
  },
  profileChipIcon: {
    fontSize: FONTS.size.sm,
  },
  profileChipText: {
    color: COLORS.primaryLight,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },

  // Cards
  cardWrap: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  card: {
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
  diaryIconWrap: {
    backgroundColor: COLORS.primary + '18',
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
  viewLog: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    fontWeight: '600',
  },

  // AI Clean row
  aiCleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  aiCleanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.border + '60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCleanIconWrapActive: {
    backgroundColor: COLORS.success + '1E',
  },
  aiCleanBody: {
    flex: 1,
  },
  aiCleanTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: '600',
  },
  aiCleanSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    marginTop: 1,
  },
  aiCleanPill: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.border,
    padding: 3,
    justifyContent: 'center',
  },
  aiCleanPillActive: {
    backgroundColor: COLORS.success + '55',
  },
  aiCleanKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'flex-start',
  },
  aiCleanKnobActive: {
    backgroundColor: COLORS.success,
    alignSelf: 'flex-end',
  },

  spacer: { height: SIZES.lg },
});
