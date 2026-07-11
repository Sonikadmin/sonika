import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useDiaryStore } from '../store/diaryStore';
import { exportDiaryPDF } from '../services/HearingDiary';
import { formatDuration, formatDate, formatTime } from '../utils/audio';
import { HearingDiaryEntry } from '../types';

export default function HearingDiaryScreen() {
  const { entries } = useDiaryStore();
  const [exporting, setExporting] = useState(false);

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const total = entries.reduce((sum, e) => sum + e.duration, 0);
    const byProfile: Record<string, { name: string; minutes: number; color: string }> = {};
    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.warning, COLORS.success];
    let ci = 0;
    for (const e of entries) {
      if (!byProfile[e.profileId]) {
        byProfile[e.profileId] = { name: e.profileName, minutes: 0, color: colors[ci++ % colors.length] };
      }
      byProfile[e.profileId].minutes += e.duration;
    }
    const topProfiles = Object.values(byProfile).sort((a, b) => b.minutes - a.minutes);

    // Last 7 days usage
    const now = Date.now();
    const daily: number[] = Array(7).fill(0);
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now - i * 86400000);
      dayLabels.push(day.toLocaleDateString('it-IT', { weekday: 'short' }));
    }
    for (const e of entries) {
      const daysAgo = Math.floor((now - e.startTime) / 86400000);
      if (daysAgo < 7) daily[6 - daysAgo] += e.duration;
    }

    return { total, topProfiles, daily, dayLabels, sessionCount: entries.length };
  }, [entries]);

  const recentSessions = useMemo(() =>
    [...entries].sort((a, b) => b.startTime - a.startTime).slice(0, 20),
    [entries]
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDiaryPDF(entries);
    } catch (e: any) {
      Alert.alert('Errore esportazione', e.message ?? 'Impossibile generare il PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Diario dell'Udito</Text>
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={exporting || entries.length === 0}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={16} color={COLORS.white} />
                <Text style={styles.exportBtnText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Nessun dato ancora</Text>
            <Text style={styles.emptyText}>
              I dati di utilizzo appariranno qui dopo aver usato Sonika per la prima volta.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <StatCard label="Sessioni" value={String(stats?.sessionCount ?? 0)} icon="mic" />
              <StatCard label="Tempo totale" value={formatDuration(stats?.total ?? 0)} icon="time" />
            </View>

            {/* 7-day bar chart */}
            {stats && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Ultimi 7 giorni (minuti)</Text>
                <DailyChart daily={stats.daily} labels={stats.dayLabels} />
              </View>
            )}

            {/* Profile breakdown */}
            {stats && stats.topProfiles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Utilizzo per profilo</Text>
                {stats.topProfiles.map((p) => (
                  <ProfileBar
                    key={p.name}
                    name={p.name}
                    minutes={p.minutes}
                    total={stats.total}
                    color={p.color}
                  />
                ))}
              </View>
            )}

            {/* Recent sessions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sessioni recenti</Text>
              {recentSessions.map((entry) => (
                <SessionRow key={entry.id} entry={entry} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    padding: SIZES.lg,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  value: {
    color: COLORS.text,
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
});

function DailyChart({ daily, labels }: { daily: number[]; labels: string[] }) {
  const maxVal = Math.max(...daily, 1);
  const W = 280;
  const H = 80;
  const barW = W / daily.length - 6;

  return (
    <Svg width={W} height={H + 20}>
      {daily.map((val, i) => {
        const bh = (val / maxVal) * H;
        const x = i * (W / daily.length) + 3;
        const y = H - bh;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={bh} rx={3} fill={COLORS.primary + 'CC'} />
            <SvgText x={x + barW / 2} y={H + 14} fontSize={9} fill={COLORS.textMuted} textAnchor="middle">
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function ProfileBar({ name, minutes, total, color }: { name: string; minutes: number; total: number; color: string }) {
  const pct = total > 0 ? (minutes / total) * 100 : 0;
  return (
    <View style={pbStyles.row}>
      <Text style={pbStyles.name} numberOfLines={1}>{name}</Text>
      <View style={pbStyles.barBg}>
        <View style={[pbStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={pbStyles.value}>{formatDuration(minutes)}</Text>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  name: {
    color: COLORS.text,
    fontSize: FONTS.size.sm,
    width: 90,
  },
  barBg: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 4,
  },
  value: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    width: 48,
    textAlign: 'right',
  },
});

function SessionRow({ entry }: { entry: HearingDiaryEntry }) {
  return (
    <View style={srStyles.row}>
      <View style={srStyles.info}>
        <Text style={srStyles.profile}>{entry.profileName}</Text>
        <Text style={srStyles.date}>{formatDate(entry.startTime)} · {formatTime(entry.startTime)}</Text>
      </View>
      <Text style={srStyles.duration}>{formatDuration(entry.duration)}</Text>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  info: { flex: 1 },
  profile: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  date: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    marginTop: 2,
  },
  duration: {
    color: COLORS.secondary,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semibold,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadius.md,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    padding: SIZES.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.lg,
    ...SHADOWS.small,
  },
  chartTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginBottom: SIZES.md,
    alignSelf: 'flex-start',
  },
  section: {
    marginBottom: SIZES.xl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    marginBottom: SIZES.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    gap: SIZES.md,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
