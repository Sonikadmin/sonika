import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { useSettingsStore } from '../store/settingsStore';
import { useAudioStore } from '../store/audioStore';
import { shareCrashReport } from '../services/CrashLog';
import { requestIgnoreBatteryOptimizations } from '../services/BatteryGuard';

export default function SettingsScreen() {
  const { settings, updateSettings, updateSmartNotifications } = useSettingsStore();
  const { connectedDevices } = useAudioStore();
  const btMics = connectedDevices.filter((d) => d.type === 'microphone');
  const btOutputs = connectedDevices.filter((d) => d.type !== 'microphone');

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Impostazioni</Text>

        {/* Audio quality */}
        <Section title="Qualità Audio">
          <SegmentControl
            label="Modalità elaborazione"
            options={[
              { value: 'low_latency',   label: '⚡ Bassa Latenza' },
              { value: 'high_quality',  label: '🎵 Alta Qualità'  },
            ]}
            selected={settings.audioQuality}
            onSelect={(v) => updateSettings({ audioQuality: v as any })}
          />
        </Section>

        {/* Bluetooth devices */}
        <Section title="Dispositivi Bluetooth">
          {btOutputs.length > 0 ? (
            <>
              <Text style={styles.subLabel}>Output preferito:</Text>
              {btOutputs.map((d) => (
                <DeviceRow
                  key={d.id}
                  name={d.name}
                  icon={d.type === 'bone_conduction' ? 'glasses-outline' : 'headset-outline'}
                  selected={settings.preferredBluetoothOutputId === d.id}
                  onSelect={() => updateSettings({ preferredBluetoothOutputId: d.id })}
                />
              ))}
            </>
          ) : (
            <Text style={styles.noDevices}>Nessun dispositivo audio BT rilevato</Text>
          )}
          {btMics.length > 0 && (
            <>
              <Text style={[styles.subLabel, { marginTop: SIZES.md }]}>Microfono BT preferito:</Text>
              {btMics.map((d) => (
                <DeviceRow
                  key={d.id}
                  name={d.name}
                  icon="mic-outline"
                  selected={settings.preferredBluetoothMicId === d.id}
                  onSelect={() => updateSettings({ preferredBluetoothMicId: d.id })}
                />
              ))}
            </>
          )}
        </Section>

        {/* Smart notifications */}
        <Section title="Notifiche Sonore Intelligenti">
          <Text style={styles.sectionDesc}>
            Sonika vibra e mostra un avviso visivo quando rileva questi suoni.
          </Text>
          {(Object.entries({
            doorbell:       '🔔 Campanello',
            intercom:       '📢 Citofono',
            babyCrying:     '👶 Pianto bambino',
            emergencySirens:'🚨 Sirene di emergenza',
            alarms:         '⚠️ Allarmi',
          }) as [keyof typeof settings.smartNotifications, string][]).map(([key, label]) => (
            <SettingRow
              key={key}
              label={label}
              value={settings.smartNotifications[key]}
              onToggle={(v) => updateSmartNotifications({ [key]: v })}
            />
          ))}
        </Section>

        {/* Behaviour */}
        <Section title="Comportamento">
          <SettingRow
            label="Avvio automatico all'accensione"
            value={settings.autoStart}
            onToggle={(v) => updateSettings({ autoStart: v })}
          />
          <SettingRow
            label="Riduzione rumore automatica"
            description="Attiva Sonika Clean all'avvio"
            value={settings.autoNoiseReduction}
            onToggle={(v) => updateSettings({ autoNoiseReduction: v })}
          />
          <SettingRow
            label="Modalità Discreta"
            description="Nessun banner o notifica visibile in background"
            value={settings.discreteMode}
            onToggle={(v) => updateSettings({ discreteMode: v })}
          />
        </Section>

        {/* AI exam reading */}
        <Section title="Lettura AI esame">
          <View style={styles.apiKeyBox}>
            <Text style={styles.apiKeyLabel}>Chiave API Anthropic</Text>
            <Text style={styles.apiKeyDesc}>
              Serve solo per leggere l'esame audiometrico da una foto
              (Profili → Profilo su misura). Puoi crearla su console.anthropic.com.
            </Text>
            <TextInput
              style={styles.apiKeyInput}
              value={settings.anthropicApiKey ?? ''}
              onChangeText={(v) => updateSettings({ anthropicApiKey: v })}
              placeholder="sk-ant-…"
              placeholderTextColor={COLORS.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
        </Section>

        {/* Support */}
        <Section title="Assistenza">
          <TouchableOpacity
            style={styles.supportRow}
            onPress={() => requestIgnoreBatteryOptimizations()}
          >
            <Ionicons name="battery-charging-outline" size={20} color={COLORS.success} />
            <View style={styles.supportBody}>
              <Text style={styles.supportTitle}>Esecuzione in background</Text>
              <Text style={styles.supportDesc}>
                Escludi Sonika dall'ottimizzazione batteria per non farlo spegnere in tasca
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportRow} onPress={() => shareCrashReport()}>
            <Ionicons name="bug-outline" size={20} color={COLORS.warning} />
            <View style={styles.supportBody}>
              <Text style={styles.supportTitle}>Segnala un problema</Text>
              <Text style={styles.supportDesc}>
                Condividi l'ultimo errore registrato dall'app
              </Text>
            </View>
            <Ionicons name="share-outline" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Section>

        {/* App info */}
        <View style={styles.about}>
          <Text style={styles.aboutLogo}>Sonika</Text>
          <Text style={styles.aboutVersion}>Versione 1.4.0</Text>
          <Text style={styles.aboutDesc}>Ausilio acustico intelligente per iOS e Android</Text>
          <Text style={styles.aboutCopy}>© 2024 Sonika. Tutti i diritti riservati.</Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: SIZES.xl },
  title: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SIZES.sm,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
});

function SettingRow({
  label, description, value, onToggle,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.label}>{label}</Text>
        {description && <Text style={rowStyles.desc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
        thumbColor={value ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SIZES.md,
  },
  info: { flex: 1 },
  label: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  desc: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    marginTop: 2,
  },
});

function DeviceRow({
  name, icon, selected, onSelect,
}: {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity style={[devStyles.row, selected && devStyles.rowSelected]} onPress={onSelect}>
      <Ionicons name={icon} size={20} color={selected ? COLORS.primary : COLORS.textMuted} />
      <Text style={[devStyles.name, selected && devStyles.nameSelected]}>{name}</Text>
      {selected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

const devStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    gap: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowSelected: {
    backgroundColor: COLORS.primary + '1A',
  },
  name: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  nameSelected: {
    color: COLORS.primaryLight,
    fontWeight: FONTS.weight.semibold,
  },
});

function SegmentControl({
  label, options, selected, onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={segStyles.container}>
      <Text style={segStyles.label}>{label}</Text>
      <View style={segStyles.options}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[segStyles.option, selected === o.value && segStyles.optionSelected]}
            onPress={() => onSelect(o.value)}
          >
            <Text style={[segStyles.optionText, selected === o.value && segStyles.optionTextSelected]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: { padding: SIZES.md },
  label: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    marginBottom: SIZES.sm,
  },
  options: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.md,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadius.sm,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  optionTextSelected: {
    color: COLORS.white,
    fontWeight: FONTS.weight.semibold,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SIZES.lg, paddingBottom: 40 },
  apiKeyBox: {
    padding: SIZES.md,
  },
  apiKeyLabel: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
    marginBottom: 4,
  },
  apiKeyDesc: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    lineHeight: 16,
    marginBottom: SIZES.sm,
  },
  apiKeyInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: SIZES.borderRadius.sm,
    color: COLORS.text,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: FONTS.size.sm,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    padding: SIZES.md,
  },
  supportBody: {
    flex: 1,
  },
  supportTitle: {
    color: COLORS.text,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
  },
  supportDesc: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.xs,
    marginTop: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    marginBottom: SIZES.xl,
  },
  subLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
  },
  noDevices: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    padding: SIZES.md,
    textAlign: 'center',
  },
  sectionDesc: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    padding: SIZES.md,
    lineHeight: 18,
  },
  about: {
    alignItems: 'center',
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xl,
    gap: 4,
  },
  aboutLogo: {
    color: COLORS.primary,
    fontSize: FONTS.size.xxxl,
    fontWeight: FONTS.weight.heavy,
    letterSpacing: -1,
  },
  aboutVersion: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
  },
  aboutDesc: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
  },
  aboutCopy: {
    color: COLORS.textDisabled,
    fontSize: FONTS.size.xs,
    marginTop: SIZES.sm,
  },
});
