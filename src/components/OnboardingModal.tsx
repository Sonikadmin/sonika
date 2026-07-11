import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES, GRADIENTS } from '../constants/theme';
import { useSettingsStore } from '../store/settingsStore';

const STEPS = [
  {
    icon: '👂',
    title: 'Benvenuto in Sonika',
    text:
      'Sonika trasforma il tuo telefono in un amplificatore acustico intelligente: ' +
      'capta i suoni intorno a te, li pulisce e li adatta al tuo udito.',
  },
  {
    icon: '🎧',
    title: 'Ti servono le cuffie',
    text:
      'Collega cuffie o auricolari (Bluetooth o con filo), poi tocca il grande ' +
      'cerchio nella Home per accendere l\'amplificazione. Alla prima accensione ' +
      'ti chiederemo il permesso di usare il microfono.',
  },
  {
    icon: '🦻',
    title: 'Rendilo tuo',
    text:
      'Nella sezione Profili puoi creare un profilo su misura dal tuo esame ' +
      'audiometrico — fotografandolo, inserendolo a mano o facendo il test ' +
      'dell\'udito direttamente nell\'app.',
  },
];

export function OnboardingModal() {
  const { settings, updateSettings } = useSettingsStore();
  const [step, setStep] = useState(0);

  if (!settings.showOnboarding) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const next = () => {
    if (isLast) updateSettings({ showOnboarding: false });
    else setStep(step + 1);
  };

  return (
    <Modal visible animationType="fade">
      <LinearGradient
        colors={GRADIENTS.background}
        locations={[0, 0.45, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.flex}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <TouchableOpacity
            style={styles.skip}
            onPress={() => updateSettings({ showOnboarding: false })}
          >
            <Text style={styles.skipText}>Salta</Text>
          </TouchableOpacity>

          <View style={styles.body}>
            <Text style={styles.icon}>{current.icon}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.text}>{current.text}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={next}>
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.btnInner}
              >
                <Text style={styles.btnText}>{isLast ? 'Inizia' : 'Avanti'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: SIZES.xl,
  },
  skip: {
    alignSelf: 'flex-end',
    padding: SIZES.sm,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.lg,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.heavy,
    textAlign: 'center',
  },
  text: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: SIZES.sm,
  },
  footer: {
    gap: SIZES.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.cyan,
    width: 22,
  },
  btn: {
    borderRadius: SIZES.borderRadius.md,
    overflow: 'hidden',
  },
  btnInner: {
    paddingVertical: SIZES.lg,
    alignItems: 'center',
  },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
});
