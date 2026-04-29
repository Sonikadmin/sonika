import { EQBand } from '../types';

export const flatEQBands = (): EQBand[] => [
  { id: 'b1', frequency: 125,  gain: 0, label: '125Hz' },
  { id: 'b2', frequency: 500,  gain: 0, label: '500Hz' },
  { id: 'b3', frequency: 1000, gain: 0, label: '1kHz'  },
  { id: 'b4', frequency: 3000, gain: 0, label: '3kHz'  },
  { id: 'b5', frequency: 8000, gain: 0, label: '8kHz'  },
];

export const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};
