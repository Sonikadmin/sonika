/**
 * ExposureGuard — igiene dell'ascolto.
 *
 * Quando l'amplificazione resta attiva a lungo, un ascolto prolungato a
 * livelli elevati affatica l'udito: dopo 2 ore di sessione continua l'app
 * propone una breve pausa con una notifica gentile. Il promemoria viene
 * annullato se l'utente spegne prima.
 */
import * as Notifications from 'expo-notifications';
import { useAudioStore } from '../store/audioStore';

const PAUSE_AFTER_SECONDS = 2 * 60 * 60; // 2 ore

let scheduledId: string | null = null;

export function initExposureGuard(): () => void {
  return useAudioStore.subscribe((s, prev) => {
    if (s.isRunning && !prev.isRunning) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Una pausa per le tue orecchie 👂',
          body:
            'Sonika è attivo da 2 ore. Una breve pausa aiuta a proteggere il tuo udito.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: PAUSE_AFTER_SECONDS,
        },
      })
        .then((id) => { scheduledId = id; })
        .catch(() => {});
    } else if (!s.isRunning && prev.isRunning && scheduledId) {
      Notifications.cancelScheduledNotificationAsync(scheduledId).catch(() => {});
      scheduledId = null;
    }
  });
}
