/**
 * SoundClassifier — real-time classification of critical environmental sounds.
 *
 * PROTOTYPE: raises simulated events for demo. In production use Apple's
 * SoundAnalysis framework (iOS 15+) or TensorFlow Lite YAMNet model (Android).
 */
import * as Notifications from 'expo-notifications';

export type SoundEvent =
  | 'doorbell'
  | 'intercom'
  | 'babyCrying'
  | 'emergencySirens'
  | 'alarms';

const LABELS: Record<SoundEvent, string> = {
  doorbell: '🔔 Campanello',
  intercom: '📢 Citofono',
  babyCrying: '👶 Pianto bambino',
  emergencySirens: '🚨 Sirena di emergenza',
  alarms: '⚠️ Allarme',
};

type EventCallback = (event: SoundEvent) => void;

class SoundClassifierService {
  private callbacks: EventCallback[] = [];
  private enabledEvents: Set<SoundEvent> = new Set([
    'doorbell', 'intercom', 'babyCrying', 'emergencySirens', 'alarms',
  ]);

  start(): void {
    // In production: start native audio analysis pipeline
  }

  stop(): void {
    // In production: stop native audio analysis pipeline
  }

  setEnabledEvents(events: Partial<Record<SoundEvent, boolean>>): void {
    (Object.entries(events) as [SoundEvent, boolean][]).forEach(([event, enabled]) => {
      if (enabled) this.enabledEvents.add(event);
      else this.enabledEvents.delete(event);
    });
  }

  onSoundDetected(cb: EventCallback): () => void {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter((c) => c !== cb);
    };
  }

  async triggerEvent(event: SoundEvent): Promise<void> {
    if (!this.enabledEvents.has(event)) return;

    this.callbacks.forEach((cb) => cb(event));

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sonika — Suono rilevato',
        body: LABELS[event],
        sound: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  }
}

export const soundClassifier = new SoundClassifierService();
