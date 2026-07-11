import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES, SHADOWS, GRADIENTS } from '../constants/theme';
import { useProfileStore } from '../store/profileStore';
import { useAudioStore } from '../store/audioStore';
import { AudioProfile } from '../types';
import { flatEQBands } from '../utils/audio';
import { nanoid } from '../utils/nanoid';
import { AudiogramModal } from '../components/AudiogramModal';

export default function ProfilesScreen() {
  const { profiles, activeProfileId, setActiveProfile, updateProfile, addProfile,
          deleteProfile, renameProfile, resetCustomProfile } = useProfileStore();
  const { applyProfileSettings } = useAudioStore();

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingId, setRenamingId] = useState('');
  const [newName, setNewName] = useState('');
  const [audiogramVisible, setAudiogramVisible] = useState(false);

  const handleSelect = (profile: AudioProfile) => {
    setActiveProfile(profile.id);
    applyProfileSettings(profile);
  };

  const handleRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setNewName(currentName);
    setRenameModalVisible(true);
  };

  const confirmRename = () => {
    if (newName.trim()) renameProfile(renamingId, newName.trim());
    setRenameModalVisible(false);
  };

  const handleDelete = (profile: AudioProfile) => {
    if (profile.isPreset) {
      Alert.alert('Profilo preimpostato', 'I profili preimpostati non possono essere eliminati.');
      return;
    }
    Alert.alert(
      'Elimina profilo',
      `Eliminare "${profile.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => deleteProfile(profile.id) },
      ]
    );
  };

  const handleAddNew = () => {
    const newProfile: AudioProfile = {
      id: nanoid(),
      name: 'Nuovo Profilo',
      icon: '🎛️',
      leftEQ: { bands: flatEQBands(), volume: 0.8 },
      rightEQ: { bands: flatEQBands(), volume: 0.8 },
      stereoBalance: 0,
      amplification: 2,
      sonikaClean: false,
      conversationMode: false,
      preferredMicSource: 'smartphone',
      preferredOutput: 'bluetooth_headphones',
      isPreset: false,
      createdAt: Date.now(),
    };
    addProfile(newProfile);
    handleRename(newProfile.id, newProfile.name);
  };

  const presets = profiles.filter((p) => p.isPreset);
  const customs = profiles.filter((p) => !p.isPreset);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profili Audio</Text>

        {/* Audiogram hero card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAudiogramVisible(true)}
          style={styles.audiogramCardWrap}
        >
          <LinearGradient
            colors={GRADIENTS.primarySoft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.audiogramCard}
          >
            <View style={styles.audiogramIconWrap}>
              <Text style={styles.audiogramIcon}>🦻</Text>
            </View>
            <View style={styles.audiogramBody}>
              <Text style={styles.audiogramTitle}>Profilo su misura</Text>
              <Text style={styles.audiogramSub}>
                Crea il tuo profilo dall'esame audiometrico — a mano o con l'AI
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.cyan} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Preset profiles */}
        <Text style={styles.sectionLabel}>Preimpostati</Text>
        <View style={styles.grid}>
          {presets.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              active={profile.id === activeProfileId}
              onSelect={() => handleSelect(profile)}
              onRename={() => handleRename(profile.id, profile.name)}
              onDelete={() => handleDelete(profile)}
              onReset={profile.id === 'custom' ? resetCustomProfile : undefined}
            />
          ))}
        </View>

        {/* Custom profiles */}
        {customs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Personalizzati</Text>
            <View style={styles.grid}>
              {customs.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  active={profile.id === activeProfileId}
                  onSelect={() => handleSelect(profile)}
                  onRename={() => handleRename(profile.id, profile.name)}
                  onDelete={() => handleDelete(profile)}
                />
              ))}
            </View>
          </>
        )}

        {/* Add new profile button */}
        <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Nuovo profilo personalizzato</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Rename modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rinomina Profilo</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              selectTextOnFocus
              maxLength={30}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Nome profilo"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmRename}>
                <Text style={styles.modalConfirmText}>Salva</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audiogram modal */}
      <AudiogramModal
        visible={audiogramVisible}
        onClose={() => setAudiogramVisible(false)}
      />
    </ScreenBackground>
  );
}

function ProfileCard({
  profile, active, onSelect, onRename, onDelete, onReset,
}: {
  profile: AudioProfile;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onReset?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive, active && SHADOWS.glow(COLORS.primary)]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <Text style={styles.cardIcon}>{profile.icon}</Text>
      <Text style={[styles.cardName, active && styles.cardNameActive]} numberOfLines={1}>
        {profile.name}
      </Text>
      <Text style={styles.cardMeta}>
        {profile.amplification}x · {profile.sonikaClean ? '✨' : ''}
        {profile.conversationMode ? '🗣️' : ''}
      </Text>
      {active && (
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
          <Text style={styles.activeBadgeText}>Attivo</Text>
        </View>
      )}
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onRename} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil-outline" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
        {onReset && (
          <TouchableOpacity onPress={onReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        {!profile.isPreset && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const CARD_SIZE = '47%';

const styles = StyleSheet.create({
  container: { flex: 1 },
  audiogramCardWrap: {
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.cyan + '55',
    overflow: 'hidden',
    marginBottom: SIZES.lg,
  },
  audiogramCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    padding: SIZES.lg,
  },
  audiogramIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: COLORS.cyan + '1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audiogramIcon: {
    fontSize: 24,
  },
  audiogramBody: {
    flex: 1,
  },
  audiogramTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    marginBottom: 2,
  },
  audiogramSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    lineHeight: 16,
  },
  content:   { padding: SIZES.lg, paddingBottom: 40 },
  title: {
    color: COLORS.text,
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SIZES.sm,
    marginTop: SIZES.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginBottom: SIZES.sm,
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    padding: SIZES.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardActive: {
    backgroundColor: COLORS.primary + '1A',
    borderColor: COLORS.primary,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: SIZES.xs,
  },
  cardName: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
    marginBottom: 2,
  },
  cardNameActive: {
    color: COLORS.primaryLight,
  },
  cardMeta: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    marginBottom: SIZES.sm,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: SIZES.xs,
  },
  activeBadgeText: {
    color: COLORS.primary,
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginTop: SIZES.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    marginTop: SIZES.xl,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.xl,
    padding: SIZES.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    marginBottom: SIZES.lg,
  },
  modalInput: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.md,
    padding: SIZES.md,
    color: COLORS.text,
    fontSize: FONTS.size.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  modalCancel: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
  },
  modalConfirm: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadius.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
});
