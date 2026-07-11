import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES, GRADIENTS } from '../constants/theme';
import { useAudiogramStore } from '../store/audiogramStore';
import { useProfileStore } from '../store/profileStore';
import { useAudioStore } from '../store/audioStore';
import { useSettingsStore } from '../store/settingsStore';
import { AudiogramChart, EAR_COLORS } from './AudiogramChart';
import {
  audiogramToProfile,
  classifyLoss,
  hasData,
  AUDIOGRAM_PROFILE_ID,
} from '../services/Audiogram';
import { extractAudiogramFromImage, AudiogramAIError } from '../services/AudiogramAI';
import { HearingTestModal } from './HearingTestModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Ear = 'left' | 'right';

export function AudiogramModal({ visible, onClose }: Props) {
  const { audiogram, setThreshold, setAll, resetEar } = useAudiogramStore();
  const { profiles, addProfile, updateProfile, setActiveProfile } = useProfileStore();
  const { applyProfileSettings } = useAudioStore();
  const { settings } = useSettingsStore();

  const [activeEar, setActiveEar] = useState<Ear>('right');
  const [aiBusy, setAiBusy] = useState(false);
  const [testVisible, setTestVisible] = useState(false);

  const leftSummary = classifyLoss(audiogram.left);
  const rightSummary = classifyLoss(audiogram.right);
  const canGenerate = hasData(audiogram.left) || hasData(audiogram.right);

  const handleSetThreshold = useCallback(
    (freq: number, db: number) => setThreshold(activeEar, freq, db),
    [activeEar, setThreshold],
  );

  const runAI = useCallback(async (base64: string) => {
    setAiBusy(true);
    try {
      const extracted = await extractAudiogramFromImage(
        base64,
        settings.anthropicApiKey ?? '',
      );
      setAll(extracted);
      Alert.alert(
        'Esame letto',
        'Le soglie sono state estratte dalla foto. Controlla il grafico e correggi eventuali punti toccandoli prima di generare il profilo.',
      );
    } catch (e: any) {
      const msg = e instanceof AudiogramAIError ? e.message : 'Errore inatteso. Riprova.';
      Alert.alert('Lettura non riuscita', msg);
    } finally {
      setAiBusy(false);
    }
  }, [settings.anthropicApiKey, setAll]);

  const pickImage = useCallback((source: 'camera' | 'library') => {
    if (!(settings.anthropicApiKey ?? '').trim()) {
      Alert.alert(
        'Chiave AI mancante',
        'Per leggere l\'esame con l\'AI serve una chiave API Anthropic. Puoi inserirla in Impostazioni → Lettura AI esame, oppure inserire i valori a mano toccando il grafico.',
      );
      return;
    }
    Alert.alert(
      'Privacy',
      'La foto dell\'esame verrà inviata ad Anthropic (API Claude) solo per estrarre i valori. Non viene salvata dall\'app né usata per altri scopi. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          onPress: async () => {
            try {
              let result: ImagePicker.ImagePickerResult;
              if (source === 'camera') {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert('Permesso negato', 'Serve l\'accesso alla fotocamera.');
                  return;
                }
                result = await ImagePicker.launchCameraAsync({
                  base64: true,
                  quality: 0.8,
                });
              } else {
                result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  base64: true,
                  quality: 0.8,
                });
              }
              const asset = result.assets?.[0];
              if (!result.canceled && asset?.base64) {
                await runAI(asset.base64);
              }
            } catch {
              Alert.alert('Errore', 'Impossibile acquisire l\'immagine.');
            }
          },
        },
      ],
    );
  }, [settings.anthropicApiKey, runAI]);

  const handleGenerate = useCallback(() => {
    const result = audiogramToProfile(audiogram);

    const exists = profiles.some((p) => p.id === AUDIOGRAM_PROFILE_ID);
    if (exists) updateProfile(AUDIOGRAM_PROFILE_ID, result.profile);
    else addProfile(result.profile);

    setActiveProfile(AUDIOGRAM_PROFILE_ID);
    applyProfileSettings(result.profile);

    const lines: string[] = [];
    if (result.rightSummary) {
      lines.push(`Orecchio destro: ${result.rightSummary.label} (PTA ${result.rightSummary.pta} dB)`);
    }
    if (result.leftSummary) {
      lines.push(`Orecchio sinistro: ${result.leftSummary.label} (PTA ${result.leftSummary.pta} dB)`);
    }
    lines.push(`Amplificazione: ${result.profile.amplification}x`);
    if (result.partialCompensation) {
      lines.push(
        '\n⚠️ La perdita supera in parte quanto Sonika può compensare: il profilo applica il massimo possibile. Per perdite di questo grado consulta un audiologo.',
      );
    }

    Alert.alert('Profilo "Su misura" attivato', lines.join('\n'), [
      { text: 'OK', onPress: onClose },
    ]);
  }, [audiogram, profiles, updateProfile, addProfile, setActiveProfile, applyProfileSettings, onClose]);

  const earButton = (ear: Ear, label: string) => (
    <TouchableOpacity
      style={[
        styles.earBtn,
        activeEar === ear && { backgroundColor: EAR_COLORS[ear] + '26', borderColor: EAR_COLORS[ear] },
      ]}
      onPress={() => setActiveEar(ear)}
    >
      <Text style={[styles.earBtnText, activeEar === ear && { color: EAR_COLORS[ear] }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient
        colors={GRADIENTS.background}
        locations={[0, 0.45, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.flex}
      >
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Il tuo esame</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Chiudi"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
              <Text style={styles.disclaimerText}>
                Sonika non è un dispositivo medico e non sostituisce un apparecchio
                acustico né il parere di un audiologo. Il profilo generato è una
                personalizzazione dell'ascolto basata sul tuo esame.
              </Text>
            </View>

            {/* Test in-app */}
            <TouchableOpacity
              style={styles.testBtn}
              activeOpacity={0.8}
              onPress={() => setTestVisible(true)}
            >
              <Ionicons name="headset" size={22} color={COLORS.primaryLight} />
              <View style={styles.testBtnBody}>
                <Text style={styles.testBtnTitle}>Fai il test dell'udito adesso</Text>
                <Text style={styles.testBtnSub}>
                  3-4 minuti con le cuffie — compila l'audiogramma da solo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primaryLight} />
            </TouchableOpacity>

            {/* AI import */}
            <Text style={styles.sectionLabel}>Oppure leggi dall'esame (AI)</Text>
            <View style={styles.aiRow}>
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() => pickImage('camera')}
                disabled={aiBusy}
              >
                <Ionicons name="camera-outline" size={20} color={COLORS.cyan} />
                <Text style={styles.aiBtnText}>Scatta foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() => pickImage('library')}
                disabled={aiBusy}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.cyan} />
                <Text style={styles.aiBtnText}>Dalla galleria</Text>
              </TouchableOpacity>
            </View>
            {aiBusy && (
              <View style={styles.aiBusyRow}>
                <ActivityIndicator size="small" color={COLORS.cyan} />
                <Text style={styles.aiBusyText}>Lettura dell'esame in corso…</Text>
              </View>
            )}

            {/* Manual entry */}
            <Text style={styles.sectionLabel}>Oppure inserisci a mano</Text>
            <View style={styles.earRow}>
              {earButton('right', 'Orecchio destro (O)')}
              {earButton('left', 'Orecchio sinistro (X)')}
            </View>

            <View style={styles.chartCard}>
              <AudiogramChart
                left={audiogram.left}
                right={audiogram.right}
                activeEar={activeEar}
                onSetThreshold={handleSetThreshold}
              />
              <Text style={styles.chartHint}>
                Tocca il grafico per segnare la soglia a ogni frequenza
                ({activeEar === 'right' ? 'orecchio destro' : 'orecchio sinistro'}).
              </Text>
              <TouchableOpacity onPress={() => resetEar(activeEar)}>
                <Text style={styles.resetEar}>
                  Cancella {activeEar === 'right' ? 'orecchio destro' : 'orecchio sinistro'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Severity summary */}
            {(rightSummary || leftSummary) && (
              <View style={styles.summaryCard}>
                {rightSummary && (
                  <Text style={styles.summaryText}>
                    <Text style={{ color: EAR_COLORS.right }}>● Destro:</Text>{' '}
                    {rightSummary.label} (PTA {rightSummary.pta} dB)
                  </Text>
                )}
                {leftSummary && (
                  <Text style={styles.summaryText}>
                    <Text style={{ color: EAR_COLORS.left }}>✕ Sinistro:</Text>{' '}
                    {leftSummary.label} (PTA {leftSummary.pta} dB)
                  </Text>
                )}
              </View>
            )}

            {/* Generate button */}
            <TouchableOpacity
              style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={!canGenerate}
            >
              <LinearGradient
                colors={canGenerate ? GRADIENTS.primary : [COLORS.border, COLORS.border]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.generateBtnInner}
              >
                <Ionicons name="sparkles" size={20} color={COLORS.white} />
                <Text style={styles.generateBtnText}>Genera profilo su misura</Text>
              </LinearGradient>
            </TouchableOpacity>
            {!canGenerate && (
              <Text style={styles.generateHint}>
                Inserisci almeno una soglia per generare il profilo.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <HearingTestModal
        visible={testVisible}
        onClose={() => setTestVisible(false)}
        onComplete={() => setTestVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SIZES.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
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
  disclaimer: {
    flexDirection: 'row',
    gap: SIZES.sm,
    backgroundColor: COLORS.warning + '14',
    borderColor: COLORS.warning + '44',
    borderWidth: 1,
    borderRadius: SIZES.borderRadius.md,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
  },
  disclaimerText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    lineHeight: 17,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
    marginBottom: SIZES.sm,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    backgroundColor: COLORS.primary + '14',
    borderColor: COLORS.primary + '55',
    borderWidth: 1,
    borderRadius: SIZES.borderRadius.md,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
  },
  testBtnBody: {
    flex: 1,
  },
  testBtnTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
  testBtnSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    marginTop: 1,
  },
  aiRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  aiBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.cyan + '14',
    borderColor: COLORS.cyan + '55',
    borderWidth: 1,
    borderRadius: SIZES.borderRadius.md,
    paddingVertical: SIZES.md,
  },
  aiBtnText: {
    color: COLORS.cyan,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
  },
  aiBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  aiBusyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  earRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  earBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  earBtnText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    alignItems: 'center',
  },
  chartHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
  resetEar: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    textDecorationLine: 'underline',
    marginTop: SIZES.sm,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    marginTop: SIZES.md,
    gap: 4,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: FONTS.size.sm,
  },
  generateBtn: {
    marginTop: SIZES.lg,
    borderRadius: SIZES.borderRadius.md,
    overflow: 'hidden',
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.lg,
  },
  generateBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
  generateHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
});
