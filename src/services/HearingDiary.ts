import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { HearingDiaryEntry } from '../types';
import { formatDate, formatDuration } from '../utils/audio';

export async function exportDiaryPDF(entries: HearingDiaryEntry[]): Promise<void> {
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

  const profileTotals: Record<string, { name: string; minutes: number; count: number }> = {};
  for (const e of entries) {
    if (!profileTotals[e.profileId]) {
      profileTotals[e.profileId] = { name: e.profileName, minutes: 0, count: 0 };
    }
    profileTotals[e.profileId].minutes += e.duration;
    profileTotals[e.profileId].count += 1;
  }

  const profileRows = Object.values(profileTotals)
    .sort((a, b) => b.minutes - a.minutes)
    .map(
      (p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.count} sessioni</td>
        <td>${formatDuration(p.minutes)}</td>
      </tr>`
    )
    .join('');

  const sessionRows = [...entries]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 50)
    .map(
      (e) => `
      <tr>
        <td>${formatDate(e.startTime)}</td>
        <td>${e.profileName}</td>
        <td>${formatDuration(e.duration)}</td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #333; margin: 32px; }
  h1 { color: #7C4DFF; font-size: 28px; margin-bottom: 4px; }
  h2 { color: #555; font-size: 16px; font-weight: normal; margin-top: 0; }
  h3 { color: #7C4DFF; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #7C4DFF; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #f9f9f9; }
  .summary { background: #f0ecff; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .summary span { font-size: 22px; font-weight: bold; color: #7C4DFF; }
</style>
</head>
<body>
  <h1>Sonika — Diario dell'Udito</h1>
  <h2>Generato il ${formatDate(Date.now())}</h2>

  <div class="summary">
    Utilizzo totale registrato: <span>${formatDuration(totalMinutes)}</span>
    in <span>${entries.length}</span> sessioni
  </div>

  <h3>Utilizzo per Profilo</h3>
  <table>
    <tr><th>Profilo</th><th>Sessioni</th><th>Durata totale</th></tr>
    ${profileRows}
  </table>

  <h3>Ultime 50 sessioni</h3>
  <table>
    <tr><th>Data</th><th>Profilo</th><th>Durata</th></tr>
    ${sessionRows}
  </table>

  <p style="margin-top:40px;color:#999;font-size:12px;">
    Report generato da Sonika — Ausilio Acustico Intelligente
  </p>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Condividi Diario Sonika' });
}
