/**
 * AudiogramAI — estrazione delle soglie uditive da una foto dell'esame
 * audiometrico tramite Claude (API Anthropic, visione + structured output).
 *
 * Nota implementativa: si usa fetch diretto perché l'SDK ufficiale
 * @anthropic-ai/sdk non supporta l'ambiente React Native.
 *
 * Privacy: l'immagine dell'esame è un dato sanitario. Viene inviata ad
 * Anthropic solo su azione esplicita dell'utente, non viene salvata
 * dall'app e i valori estratti sono sempre mostrati per conferma manuale.
 */
import { Audiogram, AudiogramThresholds } from '../types';
import { AUDIOGRAM_FREQUENCIES, emptyThresholds } from './Audiogram';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    left: {
      type: 'array',
      description: 'Soglie orecchio sinistro (simboli X, curva blu)',
      items: {
        type: 'object',
        properties: {
          frequency: { type: 'integer' },
          threshold: { type: ['integer', 'null'] },
        },
        required: ['frequency', 'threshold'],
        additionalProperties: false,
      },
    },
    right: {
      type: 'array',
      description: 'Soglie orecchio destro (simboli O, curva rossa)',
      items: {
        type: 'object',
        properties: {
          frequency: { type: 'integer' },
          threshold: { type: ['integer', 'null'] },
        },
        required: ['frequency', 'threshold'],
        additionalProperties: false,
      },
    },
  },
  required: ['left', 'right'],
  additionalProperties: false,
} as const;

const PROMPT = `Questa è la foto di un esame audiometrico tonale (audiogramma).
Estrai le soglie uditive in dB HL per ciascun orecchio alle frequenze standard:
${AUDIOGRAM_FREQUENCIES.join(', ')} Hz.

Convenzioni: cerchi O / curva rossa = orecchio DESTRO; croci X / curva blu = orecchio SINISTRO.
Se il grafico usa convenzioni diverse (legenda esplicita), seguile.
Arrotonda ai 5 dB. Usa null per le frequenze non misurate.
Se l'immagine non è un audiogramma o è illeggibile, restituisci null su tutte le frequenze.`;

export class AudiogramAIError extends Error {}

function toThresholds(
  entries: Array<{ frequency: number; threshold: number | null }>,
): AudiogramThresholds {
  const t = emptyThresholds();
  for (const e of entries) {
    // accetta solo le frequenze standard e valori plausibili (-10..120 dB HL)
    if (
      (AUDIOGRAM_FREQUENCIES as readonly number[]).includes(e.frequency) &&
      (e.threshold == null || (e.threshold >= -10 && e.threshold <= 120))
    ) {
      t[e.frequency] = e.threshold;
    }
  }
  return t;
}

/**
 * Estrae l'audiogramma da un'immagine (base64, JPEG).
 * Lancia AudiogramAIError con messaggio leggibile in caso di problemi.
 */
export async function extractAudiogramFromImage(
  base64Jpeg: string,
  apiKey: string,
): Promise<Audiogram> {
  if (!apiKey.trim()) {
    throw new AudiogramAIError(
      'Nessuna chiave API configurata. Inseriscila in Impostazioni → Lettura AI esame.',
    );
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        output_config: {
          format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Jpeg,
                },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new AudiogramAIError('Connessione non riuscita. Controlla la rete e riprova.');
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new AudiogramAIError('Chiave API non valida. Controlla in Impostazioni.');
    }
    if (res.status === 429) {
      throw new AudiogramAIError('Troppe richieste. Riprova tra qualche minuto.');
    }
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ?? '';
    } catch {}
    throw new AudiogramAIError(`Errore del servizio AI (${res.status}). ${detail}`.trim());
  }

  const data = await res.json();

  if (data.stop_reason === 'refusal') {
    throw new AudiogramAIError(
      "L'AI non ha potuto elaborare questa immagine. Prova con una foto più nitida o inserisci i valori a mano.",
    );
  }

  const text = (data.content ?? []).find((b: any) => b.type === 'text')?.text;
  if (!text) {
    throw new AudiogramAIError('Risposta AI vuota. Riprova.');
  }

  let parsed: {
    left: Array<{ frequency: number; threshold: number | null }>;
    right: Array<{ frequency: number; threshold: number | null }>;
  };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AudiogramAIError('Risposta AI non interpretabile. Riprova.');
  }

  const audiogram: Audiogram = {
    left: toThresholds(parsed.left ?? []),
    right: toThresholds(parsed.right ?? []),
    source: 'photo',
    updatedAt: Date.now(),
  };

  const anyValue =
    AUDIOGRAM_FREQUENCIES.some((f) => audiogram.left[f] != null) ||
    AUDIOGRAM_FREQUENCIES.some((f) => audiogram.right[f] != null);
  if (!anyValue) {
    throw new AudiogramAIError(
      "Nell'immagine non è stato riconosciuto un audiogramma leggibile. Prova con una foto più nitida e ben illuminata.",
    );
  }

  return audiogram;
}
