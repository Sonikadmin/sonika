/**
 * Cambia UPDATE_CHECK_URL con l'URL del tuo file version.json pubblico.
 * Puoi usare un GitHub Gist, GitHub Releases o qualsiasi hosting statico.
 *
 * Formato atteso del JSON remoto:
 * {
 *   "version": "1.0.1",
 *   "versionCode": 2,
 *   "releaseNotes": "- Novità\n- Fix bug",
 *   "apkUrl": "https://...app-release.apk",
 *   "mandatory": false
 * }
 */
export const UPDATE_CHECK_URL =
  'https://raw.githubusercontent.com/Sonikadmin/sonika/main/version.json';

export const CURRENT_VERSION      = '1.1.0';
export const CURRENT_VERSION_CODE = 2;
