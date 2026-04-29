import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useProfileStore } from '../store/profileStore';
import { useAudioStore } from '../store/audioStore';

export function ProfileCarousel() {
  const { profiles, activeProfileId, setActiveProfile } = useProfileStore();
  const { applyProfileSettings } = useAudioStore();

  const handleSelect = (profileId: string) => {
    setActiveProfile(profileId);
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) applyProfileSettings(profile);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>Profili</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {profiles.map((profile) => {
          const active = profile.id === activeProfileId;
          return (
            <TouchableOpacity
              key={profile.id}
              onPress={() => handleSelect(profile.id)}
              activeOpacity={0.75}
              style={[styles.card, active && styles.cardActive, active && SHADOWS.glow(COLORS.primary)]}
            >
              <Text style={styles.icon}>{profile.icon}</Text>
              <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
                {profile.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: SIZES.md,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginBottom: SIZES.sm,
    marginHorizontal: SIZES.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scroll: {
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOWS.small,
  },
  cardActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
    textAlign: 'center',
  },
  nameActive: {
    color: COLORS.text,
    fontWeight: FONTS.weight.bold,
  },
});
