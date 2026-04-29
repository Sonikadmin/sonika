import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkForUpdate, UpdateInfo } from './UpdateService';

export const BACKGROUND_UPDATE_TASK = 'sonika-update-check';
const LAST_NOTIFIED_KEY = 'lastNotifiedVersionCode';

// Must be at module level — executed when the file is first imported
TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
  try {
    const update = await checkForUpdate();
    if (!update) return BackgroundFetch.BackgroundFetchResult.NoData;

    const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_KEY);
    if (lastNotified === String(update.versionCode)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Aggiornamento disponibile',
        body: `Sonika ${update.version} è pronto. Tocca per aggiornare.`,
        data: { updateInfo: update as unknown as Record<string, unknown> },
      },
      trigger: null,
    });

    await AsyncStorage.setItem(LAST_NOTIFIED_KEY, String(update.versionCode));
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundUpdate(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }

  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UPDATE_TASK);
  if (registered) return;

  await BackgroundFetch.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
    minimumInterval: 60 * 15, // Android enforces minimum ~15 minutes
    stopOnTerminate: false,   // continue after app closed
    startOnBoot: true,
  });
}

export function extractUpdateFromNotification(
  data: Record<string, unknown>,
): UpdateInfo | null {
  const info = data?.updateInfo;
  if (
    info &&
    typeof info === 'object' &&
    'versionCode' in info &&
    'apkUrl' in info
  ) {
    return info as UpdateInfo;
  }
  return null;
}
