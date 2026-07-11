import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES, GRADIENTS } from '../constants/theme';
import { audioEngine } from '../services/AudioEngine';
import { useAudiogramStore } from '../store/audiogramStore';
import { EAR_COLORS } from './AudiogramChart';

/**
 * Test dell'udito in-app: audiometria tonale semplificata
 * (procedura discendente -10 / ascendente +5, stile Hughson-Westlake).
 *
 * NOTA taratura: senza cuffie calibrate i valori sono INDICATIVI.
 * L'ampiezza è mappata assumendo ~100 dB SPL a fondo scala con volume
 * di sistema al massimo — l'app lo chiede esplicitamente all'utente.
 */

const TEST_FREQUENCIES = [1000, 2000, 4000, 8000, 500, 250] as const;
const EARS = ['right', 'left'] as const;
const START_LEVEL = 40;
const MIN_LEVEL = 0;
const MAX_LEVEL = 90;

type Ear = (typeof EARS)[number];
type Phase = 'intro' | 'testing' | 'done';

function amplitudeFor(dbHl: number): number {
  // 0 dB HL ≈ -100 dBFS, 90 dB HL ≈ -10 dBFS (volume sistema al massimo)
  return Math.pow(10, (dbHl - 100) / 20);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Chiamato a test completato, dopo aver salvato le soglie nello store. */
  onComplete: () => void;
}

export function HearingTestModal({ visible, onClose, onComplete }: Props) {
  const { setThreshold, resetEar } = useAudiogramStore();

  const [phase, setPhase] = useState<Phase>('intro');
  const [earIndex, setEarIndex] = useState(0);
  const [freqIndex, setFreqIndex] = useState(0);
  const [level, setLevel] = useState(START_LEVEL);
  const [tonePlaying, setTonePlaying] = useState(false);
  const ascending = useRef(false);

  const ear: Ear = EARS[earIndex];
  const freq = TEST_FREQUENCIES[freqIndex];
  const totalSteps = EARS.length * TEST_FREQUENCIES.length;
  const currentStep = earIndex * TEST_FREQUENCIES.length + freqIndex + 1;

  const stopTone = useCallback(() => {
    audioEngine.stopTone();
    setTonePlaying(false);
  }, []);

  const playCurrent = useCallback((db: number) => {
    audioEngine.playTone(freq, ear, amplitudeFor(db));
    setTonePlaying(true);
  }, [freq, ear]);

  // Suona il tono a ogni nuovo step/livello durante il test
  useEffect(() => {
    if (phase !== 'testing' || !visible) return;
    const t = setTimeout(() => playCurrent(level), 600);
    return () => { clearTimeout(t); audioEngine.stopTone(); };
  }, [phase, visible, level, earIndex, freqIndex, playCurrent]);

  // Pulizia se il modal viene chiuso a metà
  useEffect(() => {
    if (!visible) audioEngine.stopTone();
  }, [visible]);

  const advance = useCallback((thresholdDb: number) => {
    stopTone();
    setThreshold(ear, freq, thresholdDb);
    ascending.current = false;

    if (freqIndex < TEST_FREQUENCIES.length - 1) {
      setFreqIndex(freqIndex + 1);
      setLevel(START_LEVEL);
    } else if (earIndex < EARS.length - 1) {
      setEarIndex(earIndex + 1);
      setFreqIndex(0);
      setLevel(START_LEVEL);
    } else {
      setPhase('done');
    }
  }, [ear, freq, freqIndex, earIndex, setThreshold, stopTone]);

  const handleHeard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ascending.current || level <= MIN_LEVEL) {
      // prima risposta positiva in fase ascendente = soglia
      advance(level);
    } else {
      stopTone();
      setLevel(Math.max(MIN_LEVEL, level - 10));
    }
  }, [level, advance, stopTone]);

  const handleNotHeard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (level >= MAX_LEVEL) {
      // oltre il misurabile: registra il massimo e prosegui
      advance(MAX_LEVEL);
      return;
    }
    ascending.current = true;
    stopTone();
    setLevel(Math.min(MAX_LEVEL, level + 5));
  }, [level, advance, stopTone]);

  const startTest = useCallback(() => {
    resetEar('left');
    resetEar('right');
    setEarIndex(0);
    setFreqIndex(0);
    setLevel(START_LEVEL);
    ascending.current = false;
    setPhase('testing');
  }, [resetEar]);

  const handleFinish = useCallback(() => {
    setPhase('intro');
    onComplete();
  }, [onComplete]);

  const handleClose = useCallback(() => {
    stopTone();
    setPhase('intro');
    onClose();
  }, [onClose, stopTone]);

  const freqLabel = freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`;

  // Overlay assoluto (non un secondo Modal: i Modal annidati su Android
  // non vengono mostrati in modo affidabile).
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={GRADIENTS.background}
        locations={[0, 0.45, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.flex}
      >
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Test dell'udito</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi il test"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {phase === 'intro' && (
            <View style={styles.body}>
              <Text style={styles.introIcon}>🎧</Text>
              <Text style={styles.introTitle}>Prima di iniziare</Text>
              <View style={styles.checkList}>
                <Text style={styles.checkItem}>1. Indossa le cuffie (meglio se chiuse)</Text>
                <Text style={styles.checkItem}>2. Alza il volume del telefono al MASSIMO</Text>
                <Text style={styles.checkItem}>3. Mettiti in un ambiente silenzioso</Text>
              </View>
              <Text style={styles.introNote}>
                Sentirai dei toni a diverse frequenze, prima nell'orecchio destro
                e poi nel sinistro. Rispondi onestamente: il test dura 3-4 minuti.
                {'\n\n'}⚠️ Il risultato è indicativo (le cuffie non sono calibrate)
                e non sostituisce un esame audiometrico professionale.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={startTest}>
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryBtnInner}
                >
                  <Text style={styles.primaryBtnText}>Inizia il test</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'testing' && (
            <View style={styles.body}>
              <Text style={styles.progress}>
                {currentStep} di {totalSteps}
              </Text>
              <View
                style={[
                  styles.earBadge,
                  { borderColor: EAR_COLORS[ear], backgroundColor: EAR_COLORS[ear] + '1E' },
                ]}
              >
                <Text style={[styles.earBadgeText, { color: EAR_COLORS[ear] }]}>
                  {ear === 'right' ? 'Orecchio destro' : 'Orecchio sinistro'} · {freqLabel}
                </Text>
              </View>

              <View style={styles.toneIndicator}>
                <Ionicons
                  name={tonePlaying ? 'volume-high' : 'volume-mute'}
                  size={64}
                  color={tonePlaying ? COLORS.cyan : COLORS.textDisabled}
                />
                <Text style={styles.toneHint}>
                  {tonePlaying ? 'Il tono sta suonando…' : 'Preparati…'}
                </Text>
              </View>

              <Text style={styles.question}>Senti questo suono?</Text>

              <View style={styles.answerRow}>
                <TouchableOpacity
                  style={[styles.answerBtn, styles.answerYes]}
                  onPress={handleHeard}
                >
                  <Ionicons name="checkmark" size={28} color={COLORS.success} />
                  <Text style={[styles.answerText, { color: COLORS.success }]}>Lo sento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.answerBtn, styles.answerNo]}
                  onPress={handleNotHeard}
                >
                  <Ionicons name="close" size={28} color={COLORS.accent} />
                  <Text style={[styles.answerText, { color: COLORS.accent }]}>Non lo sento</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {phase === 'done' && (
            <View style={styles.body}>
              <Text style={styles.introIcon}>✅</Text>
              <Text style={styles.introTitle}>Test completato</Text>
              <Text style={styles.introNote}>
                Le tue soglie sono state riportate sull'audiogramma: controllale
                e tocca "Genera profilo su misura" per applicarle all'ascolto.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryBtnInner}
                >
                  <Text style={styles.primaryBtnText}>Vedi il risultato</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  body: {
    flex: 1,
    padding: SIZES.lg,
    alignItems: 'center',
  },
  introIcon: {
    fontSize: 56,
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
  },
  introTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    marginBottom: SIZES.lg,
  },
  checkList: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  checkItem: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  introNote: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: SIZES.borderRadius.md,
    overflow: 'hidden',
  },
  primaryBtnInner: {
    paddingVertical: SIZES.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
  progress: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginBottom: SIZES.md,
  },
  earBadge: {
    borderWidth: 1,
    borderRadius: SIZES.borderRadius.full,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    marginBottom: SIZES.xxl,
  },
  earBadgeText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  toneIndicator: {
    alignItems: 'center',
    marginBottom: SIZES.xxl,
    gap: SIZES.sm,
  },
  toneHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  question: {
    color: COLORS.text,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.semibold,
    marginBottom: SIZES.xl,
  },
  answerRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    alignSelf: 'stretch',
  },
  answerBtn: {
    flex: 1,
    alignItems: 'center',
    gap: SIZES.xs,
    paddingVertical: SIZES.xl,
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1.5,
  },
  answerYes: {
    backgroundColor: COLORS.success + '14',
    borderColor: COLORS.success + '66',
  },
  answerNo: {
    backgroundColor: COLORS.accent + '14',
    borderColor: COLORS.accent + '66',
  },
  answerText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
});
