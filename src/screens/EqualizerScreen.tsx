import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAudioStore } from '../store/audioStore';
import { EQBandSlider } from '../components/EQBandSlider';
import { StereoBalance } from '../components/StereoBalance';
import { AmplificationControl } from '../components/AmplificationControl';
import { ScreenBackground } from '../components/ScreenBackground';
import { flatEQBands } from '../utils/audio';

type Channel = 'left' | 'right';

export default function EqualizerScreen() {
  const {
    leftEQ, rightEQ, leftVolume, rightVolume,
    stereoBalance, amplification, monoMode, monoChannel,
    updateLeftBand, updateRightBand,
    setLeftVolume, setRightVolume,
    setStereoBalance, setAmplification,
    setMonoMode, setLeftEQ, setRightEQ,
  } = useAudioStore();

  const [linkedChannels, setLinkedChannels] = useState(false);
  const [activeChannel, setActiveChannel]   = useState<Channel>('left');

  const isLeft  = linkedChannels || activeChannel === 'left';
  const bands   = isLeft ? leftEQ : rightEQ;
  const volume  = isLeft ? leftVolume : rightVolume;
  const accent  = linkedChannels
    ? COLORS.primary
    : isLeft ? COLORS.primary : COLORS.secondary;

  const handleBand = (id: string, gain: number) => {
    if (linkedChannels) {
      updateLeftBand(id, gain);
      updateRightBand(id, gain);
    } else if (isLeft) {
      updateLeftBand(id, gain);
    } else {
      updateRightBand(id, gain);
    }
  };

  const handleVolume = (v: number) => {
    if (linkedChannels) {
      setLeftVolume(v);
      setRightVolume(v);
    } else if (isLeft) {
      setLeftVolume(v);
    } else {
      setRightVolume(v);
    }
  };

  const resetChannel = () => {
    if (linkedChannels) { setLeftEQ(flatEQBands()); setRightEQ(flatEQBands()); }
    else if (isLeft)    setLeftEQ(flatEQBands());
    else                setRightEQ(flatEQBands());
  };

  const resetAll = () => { setLeftEQ(flatEQBands()); setRightEQ(flatEQBands()); };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Equalizzatore</Text>
          <TouchableOpacity onPress={resetAll}>
            <Text style={styles.resetAll}>Reset tutto</Text>
          </TouchableOpacity>
        </View>

        {/* Channel link toggle */}
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Canali collegati (L = R)</Text>
          <Switch
            value={linkedChannels}
            onValueChange={setLinkedChannels}
            trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
            thumbColor={linkedChannels ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        {/* Channel selector */}
        {!linkedChannels && (
          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeChannel === 'left' && { backgroundColor: COLORS.primary + '2A', borderColor: COLORS.primary },
              ]}
              onPress={() => setActiveChannel('left')}
            >
              <Text style={[styles.segmentText, activeChannel === 'left' && { color: COLORS.primaryLight }]}>
                Sinistra (L)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeChannel === 'right' && { backgroundColor: COLORS.secondary + '22', borderColor: COLORS.secondary },
              ]}
              onPress={() => setActiveChannel('right')}
            >
              <Text style={[styles.segmentText, activeChannel === 'right' && { color: COLORS.secondary }]}>
                Destra (R)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Channel panel */}
        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <Text style={[styles.channelTitle, { color: accent }]}>
              {linkedChannels ? 'Entrambi i canali (L = R)' : isLeft ? 'Orecchio sinistro' : 'Orecchio destro'}
            </Text>
            <TouchableOpacity onPress={resetChannel}>
              <Text style={styles.resetBtn}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Volume */}
          <View style={styles.volumeRow}>
            <Text style={styles.volLabel}>Vol</Text>
            <View style={styles.volBar}>
              {[0.1, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.volStep, volume >= v && { backgroundColor: accent }]}
                  onPress={() => handleVolume(v)}
                />
              ))}
            </View>
            <Text style={[styles.volValue, { color: accent }]}>{Math.round(volume * 100)}%</Text>
          </View>

          {/* EQ bands — full width */}
          <View style={styles.bands}>
            {bands.map((band) => (
              <EQBandSlider
                key={band.id}
                band={band}
                onChange={handleBand}
                color={accent}
              />
            ))}
          </View>
        </View>

        {/* Mono mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modalità Udito Unilaterale</Text>
          <View style={styles.monoCard}>
            <View style={styles.monoToggleRow}>
              <Text style={styles.monoToggleLabel}>Attiva modalità mono</Text>
              <Switch
                value={monoMode}
                onValueChange={(v) => setMonoMode(v, monoChannel)}
                trackColor={{ false: COLORS.border, true: COLORS.warning + '88' }}
                thumbColor={monoMode ? COLORS.warning : COLORS.textMuted}
              />
            </View>
            {monoMode && (
              <View style={styles.monoChannelRow}>
                <Text style={styles.monoChannelLabel}>Orecchio attivo:</Text>
                <TouchableOpacity
                  style={[styles.channelBtn, monoChannel === 'left' && styles.channelBtnActive]}
                  onPress={() => setMonoMode(true, 'left')}
                >
                  <Text style={styles.channelBtnText}>Sinistro</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.channelBtn, monoChannel === 'right' && styles.channelBtnActive]}
                  onPress={() => setMonoMode(true, 'right')}
                >
                  <Text style={styles.channelBtnText}>Destro</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Stereo balance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bilanciamento Stereo</Text>
          <StereoBalance value={stereoBalance} onChange={setStereoBalance} />
        </View>

        {/* Amplification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amplificazione</Text>
          <AmplificationControl value={amplification} onChange={setAmplification} />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: SIZES.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
  },
  resetAll: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textDecorationLine: 'underline',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkLabel: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  segment: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  channelCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  channelTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
  },
  resetBtn: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textDecorationLine: 'underline',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  volLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    width: 24,
  },
  volBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  volStep: {
    flex: 1,
    height: 12,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  volValue: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    width: 42,
    textAlign: 'right',
  },
  bands: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  section: {
    marginTop: SIZES.xl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    marginBottom: SIZES.md,
  },
  monoCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.md,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monoToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monoToggleLabel: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  monoChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  monoChannelLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    flex: 1,
  },
  channelBtn: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadius.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  channelBtnActive: {
    backgroundColor: COLORS.warning + '33',
    borderColor: COLORS.warning,
  },
  channelBtnText: {
    color: COLORS.text,
    fontSize: FONTS.size.sm,
  },
});
