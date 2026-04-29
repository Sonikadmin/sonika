import * as FileSystem from 'expo-file-system';
import { UPDATE_CHECK_URL, CURRENT_VERSION_CODE } from '../constants/update';

export interface UpdateInfo {
  version: string;
  versionCode: number;
  releaseNotes: string;
  apkUrl: string;
  mandatory: boolean;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(UPDATE_CHECK_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: UpdateInfo = await res.json();
    if (data.versionCode > CURRENT_VERSION_CODE) return data;
    return null;
  } catch {
    return null;
  }
}

export async function downloadApk(
  apkUrl: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const dest = FileSystem.cacheDirectory + 'sonika-update.apk';

  // Rimuove eventuale download precedente
  await FileSystem.deleteAsync(dest, { idempotent: true });

  const downloadResumable = FileSystem.createDownloadResumable(
    apkUrl,
    dest,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('Download fallito');
  return result.uri;
}

export async function installApk(localUri: string): Promise<void> {
  // getContentUriAsync restituisce un content:// richiesto da Android 7+
  const contentUri = await FileSystem.getContentUriAsync(localUri);

  const IntentLauncher = await import('expo-intent-launcher');
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,          // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
