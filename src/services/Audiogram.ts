/**
 * Audiogram — dal referto audiometrico al profilo Sonika.
 *
 * Converte le soglie uditive (dB HL per frequenza, per orecchio) in
 * impostazioni EQ/amplificazione usando la formula prescrittiva NAL-R
 * (National Acoustic Laboratories, revised) — lo standard audiologico
 * per l'adattamento lineare degli apparecchi acustici.
 *
 * NAL-R: IG(f) = X + 0.31·HTL(f) + k(f)
 *   X   = 0.15 · media(HTL a 500, 1000, 2000 Hz)
 *   k(f)= correzione per frequenza (dB)
 *
 * Il guadagno prescritto viene poi suddiviso tra amplificazione globale
 * (1x–8x) e bande EQ (±12 dB per orecchio). Non sostituisce un
 * apparecchio acustico né il parere di un audiologo.
 */
import { Audiogram, AudiogramThresholds, AudioProfile, EQBand } from '../types';
import { nanoid } from '../utils/nanoid';

/** Frequenze standard dell'esame audiometrico tonale. */
export const AUDIOGRAM_FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;

/** Bande EQ di Sonika. */
const EQ_FREQUENCIES = [125, 500, 1000, 3000, 8000] as const;
const EQ_LABELS = ['125Hz', '500Hz', '1kHz', '3kHz', '8kHz'];

/** Correzioni NAL-R k(f) in dB (interpolate dove serve). */
const NALR_K: Record<number, number> = {
  125: -17,
  250: -17,
  500: -8,
  1000: 1,
  2000: -1,
  3000: -2,
  4000: -2,
  8000: -2,
};

const MAX_EQ_DB = 12;      // escursione bande EQ
const MAX_AMP = 8;         // amplificazione massima del motore
const BASE_VOLUME = 0.9;   // volume per canale nel profilo generato

export const AUDIOGRAM_PROFILE_ID = 'audiogram-custom';

export function emptyThresholds(): AudiogramThresholds {
  const t: AudiogramThresholds = {};
  for (const f of AUDIOGRAM_FREQUENCIES) t[f] = null;
  return t;
}

export function emptyAudiogram(): Audiogram {
  return {
    left: emptyThresholds(),
    right: emptyThresholds(),
    source: 'manual',
    updatedAt: Date.now(),
  };
}

/** Soglia a una frequenza, interpolando linearmente tra le vicine se assente. */
function thresholdAt(t: AudiogramThresholds, freq: number): number | null {
  const direct = t[freq];
  if (direct != null) return direct;

  // interpolazione log-lineare tra le frequenze misurate adiacenti
  const measured = AUDIOGRAM_FREQUENCIES.filter((f) => t[f] != null);
  if (measured.length === 0) return null;

  const lower = [...measured].reverse().find((f) => f < freq);
  const upper = measured.find((f) => f > freq);
  if (lower != null && upper != null) {
    const ratio = (Math.log2(freq) - Math.log2(lower)) / (Math.log2(upper) - Math.log2(lower));
    return t[lower]! + ratio * (t[upper]! - t[lower]!);
  }
  return lower != null ? t[lower]! : upper != null ? t[upper]! : null;
}

/** Guadagno inserzione NAL-R (dB) a una frequenza, ≥ 0. */
function nalrGain(t: AudiogramThresholds, freq: number): number {
  const h500 = thresholdAt(t, 500) ?? 0;
  const h1k = thresholdAt(t, 1000) ?? 0;
  const h2k = thresholdAt(t, 2000) ?? 0;
  const x = 0.15 * ((h500 + h1k + h2k) / 3);
  const htl = thresholdAt(t, freq) ?? 0;
  const k = NALR_K[freq] ?? 0;
  return Math.max(0, x + 0.31 * htl + k);
}

/** True se l'orecchio ha almeno una soglia inserita. */
export function hasData(t: AudiogramThresholds): boolean {
  return AUDIOGRAM_FREQUENCIES.some((f) => t[f] != null);
}

/** Pure Tone Average (500–4k) e classificazione della perdita. */
export function classifyLoss(t: AudiogramThresholds): { pta: number; label: string } | null {
  if (!hasData(t)) return null;
  const freqs = [500, 1000, 2000, 4000];
  const vals = freqs
    .map((f) => thresholdAt(t, f))
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  const pta = vals.reduce((a, b) => a + b, 0) / vals.length;

  let label: string;
  if (pta < 20) label = 'udito normale';
  else if (pta < 40) label = 'perdita lieve';
  else if (pta < 70) label = 'perdita moderata';
  else if (pta < 90) label = 'perdita severa';
  else label = 'perdita profonda';

  return { pta: Math.round(pta), label };
}

export interface PrescriptionResult {
  profile: AudioProfile;
  /** True se il guadagno richiesto supera quanto Sonika può erogare. */
  partialCompensation: boolean;
  leftSummary: { pta: number; label: string } | null;
  rightSummary: { pta: number; label: string } | null;
}

/**
 * Genera il profilo Sonika dall'audiogramma.
 * Se un orecchio non ha dati usa i valori dell'altro (o flat se nessuno).
 */
export function audiogramToProfile(audiogram: Audiogram): PrescriptionResult {
  const leftHas = hasData(audiogram.left);
  const rightHas = hasData(audiogram.right);
  const leftT = leftHas ? audiogram.left : audiogram.right;
  const rightT = rightHas ? audiogram.right : audiogram.left;

  // Guadagni prescritti per banda EQ, per orecchio
  const leftGains = EQ_FREQUENCIES.map((f) => nalrGain(leftT, f));
  const rightGains = EQ_FREQUENCIES.map((f) => nalrGain(rightT, f));

  // Amplificazione globale: mediana di tutti i guadagni richiesti,
  // così le bande EQ correggono solo la forma della perdita.
  const all = [...leftGains, ...rightGains].sort((a, b) => a - b);
  const medianDb = all.length ? all[Math.floor(all.length / 2)] : 0;
  const maxAmpDb = 20 * Math.log10(MAX_AMP);
  const ampDb = Math.min(Math.max(medianDb, 0), maxAmpDb);
  const amplification = Math.max(1, Math.min(10, Math.round(Math.pow(10, ampDb / 20))));
  const actualAmpDb = 20 * Math.log10(amplification);

  let clipped = false;
  const toBands = (gains: number[]): EQBand[] =>
    gains.map((g, i) => {
      const residual = g - actualAmpDb;
      const clampedGain = Math.max(-MAX_EQ_DB, Math.min(MAX_EQ_DB, residual));
      if (residual > MAX_EQ_DB + 0.5) clipped = true;
      return {
        id: `band-${EQ_FREQUENCIES[i]}`,
        frequency: EQ_FREQUENCIES[i],
        gain: Math.round(clampedGain * 2) / 2,
        label: EQ_LABELS[i],
      };
    });

  const profile: AudioProfile = {
    id: AUDIOGRAM_PROFILE_ID,
    name: 'Su misura',
    icon: '🦻',
    leftEQ: { bands: toBands(leftGains), volume: BASE_VOLUME },
    rightEQ: { bands: toBands(rightGains), volume: BASE_VOLUME },
    stereoBalance: 0,
    amplification,
    sonikaClean: false,
    conversationMode: false,
    preferredMicSource: 'smartphone',
    preferredOutput: 'bluetooth_headphones',
    isPreset: false,
    createdAt: Date.now(),
  };

  return {
    profile,
    partialCompensation: clipped,
    leftSummary: leftHas ? classifyLoss(audiogram.left) : null,
    rightSummary: rightHas ? classifyLoss(audiogram.right) : null,
  };
}
