import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useAudioStore } from '../store/audioStore';
import { EQBandSlider } from '../components/EQBandSlider';
import { StereoBalance } from '../components/StereoBalance';
import { AmplificationControl } from '../components/AmplificationControl';
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

  const handleLeftBand = (id: string, gain: number) => {
    updateLeftBand(id, gain);
    if (linkedChannels) updateRightBand(id, gain);
  };

  const handleRightBand = (id: string, gain: number) => {
    updateRightBand(id, gain);
    if (linkedChannels) updateLeftBand(id, gain);
  };

  const resetLeft = () => setLeftEQ(flatEQBands());
  const resetRight = () => setRightEQ(flatEQBands());
  const resetAll = () => { setLeftEQ(flatEQBands()); setRightEQ(flatEQBands()); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

        {/* EQ Channels */}
        <View style={styles.channelsRow}>
          {/* LEFT */}
          <View style={styles.channel}>
            <View style={styles.channelHeader}>
              <Text style={[styles.channelTitle, { color: COLORS.primary }]}>Sinistra (L)</Text>
              <TouchableOpacity onPress={resetLeft}>
                <Text style={styles.resetBtn}>Reset</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.volumeRow}>
              <Text style={styles.volLabel}>Vol</Text>
              <View style={styles.volBar}>
                <TouchableOpacity
                  style={[styles.volStep, leftVolume >= 0.1 && styles.volStepFilled]}
                  onPress={() => setLeftVolume(0.1)} />
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.volStep, leftVolume >= v && styles.volStepFilled]}
                    onPress={() => setLeftVolume(v)}
                  />
                ))}
              </View>
              <Text style={styles.volValue}>{Math.round(leftVolume * 100)}%</Text>
            </View>
            <View style={styles.bands}>
              {leftEQ.map((band) => (
                <EQBandSlider
                  key={band.id}
                  band={band}
                  onChange={handleLeftBand}
                  color={COLORS.primary}
                />
              ))}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* RIGHT */}
          <View style={styles.channel}>
            <View style={styles.channelHeader}>
              <Text style={[styles.channelTitle, { color: COLORS.secondary }]}>Destra (R)</Text>
              <TouchableOpacity onPress={resetRight}>
                <Text style={styles.resetBtn}>Reset</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.volumeRow}>
              <Text style={styles.volLabel}>Vol</Text>
              <View style={styles.volBar}>
                {[0.1, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.volStep, rightVolume >= v && { ...styles.volStepFilled, backgroundColor: COLORS.secondary }]}
                    onPress={() => setRightVolume(v)}
                  />
                ))}
              </View>
              <Text style={[styles.volValue, { color: COLORS.secondary }]}>{Math.round(rightVolume * 100)}%</Text>
            </View>
            <View style={styles.bands}>
              {rightEQ.map((band) => (
                <EQBandSlider
                  key={band.id}
                  band={band}
                  onChange={handleRightBand}
                  color={COLORS.secondary}
                />
              ))}
            </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SIZES.lg, paddingBottom: 40 },
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
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkLabel: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  channelsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  channel: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
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
    gap: 4,
    marginBottom: SIZES.md,
  },
  volLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    width: 20,
  },
  volBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  volStep: {
    flex: 1,
    height: 10,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  volStepFilled: {
    backgroundColor: COLORS.primary,
  },
  volValue: {
    color: COLORS.primary,
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    width: 32,
    textAlign: 'right',
  },
  bands: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SIZES.xs,
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
