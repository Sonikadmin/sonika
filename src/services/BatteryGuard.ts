/**
 * BatteryGuard — protegge il foreground service dai "risparmi batteria".
 *
 * Molti produttori (Xiaomi, Samsung, Huawei…) terminano i servizi in
 * background per ottimizzare la batteria: per un ausilio acustico che deve
 * restare acceso in tasca è il difetto peggiore possibile. Qui rileviamo la
 * condizione e portiamo l'utente al dialogo di sistema per escludere Sonika.
 */
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeAudioEngine from '../../modules/sonika-audio-engine/src';

const ASKED_KEY = 'sonika-battery-prompt-shown';

export function isBatteryOptimized(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeAudioEngine.isBatteryOptimized();
  } catch {
    return false;
  }
}

/** Apre il dialogo di sistema "Ignora ottimizzazione batteria" per Sonika. */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      { data: 'package:com.sonika.app' },
    );
  } catch {
    // fallback: pagina generale delle impostazioni batteria
    try {
      const IntentLauncher = await import('expo-intent-launcher');
      await IntentLauncher.startActivityAsync(
        'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      );
    } catch {}
  }
}

/**
 * Mostra il suggerimento una sola volta, dopo il primo avvio riuscito
 * dell'amplificazione, e solo se il sistema sta davvero ottimizzando l'app.
 */
export async function maybePromptBatteryWhitelist(): Promise<void> {
  if (Platform.OS !== 'android' || !isBatteryOptimized()) return;
  const asked = await AsyncStorage.getItem(ASKED_KEY);
  if (asked) return;
  await AsyncStorage.setItem(ASKED_KEY, '1');

  Alert.alert(
    'Sonika sempre attivo',
    'Per evitare che il sistema spenga Sonika quando il telefono è in tasca, ' +
      'escludi l\'app dall\'ottimizzazione della batteria. Vuoi farlo ora?\n\n' +
      '(Puoi farlo anche dopo, da Impostazioni → Esecuzione in background.)',
    [
      { text: 'Più tardi', style: 'cancel' },
      { text: 'Consenti', onPress: () => requestIgnoreBatteryOptimizations() },
    ],
  );
}
