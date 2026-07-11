/**
 * CrashLog — registro errori leggero, senza servizi esterni.
 *
 * Cattura gli errori JS non gestiti e salva l'ultimo in AsyncStorage;
 * dalle Impostazioni ("Segnala un problema") l'utente può condividerlo.
 * Se un domani servirà telemetria vera si può passare a Sentry: questo
 * modulo ne è il segnaposto a costo zero.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import { CURRENT_VERSION } from '../constants/update';

const KEY = 'sonika-last-crash';

interface CrashEntry {
  message: string;
  stack?: string;
  fatal: boolean;
  version: string;
  timestamp: number;
}

export function initCrashLog(): void {
  const globalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
  (global as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal?: boolean) => {
    const entry: CrashEntry = {
      message: String(error?.message ?? error),
      stack: typeof error?.stack === 'string' ? error.stack.slice(0, 4000) : undefined,
      fatal: !!isFatal,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
    };
    // fire-and-forget: mai bloccare il gestore errori
    AsyncStorage.setItem(KEY, JSON.stringify(entry)).catch(() => {});
    globalHandler?.(error, isFatal);
  });
}

export async function getLastCrash(): Promise<CrashEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CrashEntry) : null;
  } catch {
    return null;
  }
}

/** Apre il foglio di condivisione con il report dell'ultimo errore. */
export async function shareCrashReport(): Promise<boolean> {
  const crash = await getLastCrash();
  const body = crash
    ? [
        `Sonika ${crash.version} — segnalazione problema`,
        `Data: ${new Date(crash.timestamp).toLocaleString('it-IT')}`,
        `Fatale: ${crash.fatal ? 'sì' : 'no'}`,
        `Errore: ${crash.message}`,
        crash.stack ? `\nStack:\n${crash.stack}` : '',
      ].join('\n')
    : `Sonika ${CURRENT_VERSION} — nessun errore registrato.\nDescrivi qui il problema:`;

  try {
    await Share.share({ message: body });
    return true;
  } catch {
    return false;
  }
}
