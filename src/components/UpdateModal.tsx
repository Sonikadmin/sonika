import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { UpdateInfo, downloadApk, installApk } from '../services/UpdateService';

interface Props {
  update: UpdateInfo;
  onDismiss: () => void;
}

export function UpdateModal({ update, onDismiss }: Props) {
  const [state, setState] = useState<'idle' | 'downloading' | 'installing'>('idle');
  const [progress, setProgress] = useState(0);

  const handleUpdate = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Aggiornamento', 'Scarica la nuova versione dal sito.');
      return;
    }
    try {
      setState('downloading');
      setProgress(0);
      const localUri = await downloadApk(update.apkUrl, (pct) => setProgress(pct));
      setState('installing');
      await installApk(localUri);
      setState('idle');
    } catch (e: any) {
      setState('idle');
      Alert.alert('Errore', e.message ?? 'Aggiornamento non riuscito.');
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={update.mandatory ? undefined : onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="arrow-up-circle" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Aggiornamento disponibile</Text>
            <Text style={styles.version}>Versione {update.version}</Text>
          </View>

          {/* Note di rilascio */}
          {update.releaseNotes ? (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>Novità</Text>
              <Text style={styles.notesText}>{update.releaseNotes}</Text>
            </View>
          ) : null}

          {/* Barra di progresso download */}
          {state === 'downloading' && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Download in corso… {pct}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
            </View>
          )}

          {state === 'installing' && (
            <Text style={styles.installingLabel}>Apertura installer…</Text>
          )}

          {/* Bottoni */}
          <View style={styles.buttons}>
            {!update.mandatory && state === 'idle' && (
              <TouchableOpacity style={styles.btnSecondary} onPress={onDismiss}>
                <Text style={styles.btnSecondaryText}>Più tardi</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btnPrimary, state !== 'idle' && styles.btnDisabled]}
              onPress={handleUpdate}
              disabled={state !== 'idle'}
            >
              <Ionicons
                name={state === 'idle' ? 'download-outline' : 'hourglass-outline'}
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.btnPrimaryText}>
                {state === 'idle' ? 'Aggiorna ora' : state === 'downloading' ? `${pct}%` : 'Installazione…'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000BB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  header: {
    alignItems: 'center',
    padding: SIZES.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    marginBottom: 4,
  },
  version: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
  },
  notes: {
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notesTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SIZES.sm,
  },
  notesText: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    lineHeight: 22,
  },
  progressSection: {
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginBottom: SIZES.sm,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  installingLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
    padding: SIZES.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: SIZES.md,
    padding: SIZES.lg,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
  },
  btnPrimary: {
    flex: 2,
    flexDirection: 'row',
    gap: SIZES.sm,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
});
