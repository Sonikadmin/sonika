import React from 'react';
import { View, StyleSheet, Dimensions, GestureResponderEvent } from 'react-native';
import Svg, {
  Line,
  Circle,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';
import { COLORS, FONTS } from '../constants/theme';
import { AudiogramThresholds } from '../types';
import { AUDIOGRAM_FREQUENCIES } from '../services/Audiogram';

/** Convenzione audiologica: destra = rosso (O), sinistra = blu (X). */
export const EAR_COLORS = {
  right: '#FF6B6B',
  left: '#4D9FFF',
} as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const W = SCREEN_WIDTH - 64;
const H = 280;
const PAD_LEFT = 34;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const PAD_RIGHT = 10;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

const DB_MIN = -10;
const DB_MAX = 110;

const freqLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`);

function xFor(freqIndex: number): number {
  return PAD_LEFT + (freqIndex / (AUDIOGRAM_FREQUENCIES.length - 1)) * PLOT_W;
}

function yFor(db: number): number {
  return PAD_TOP + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * PLOT_H;
}

interface Props {
  left: AudiogramThresholds;
  right: AudiogramThresholds;
  activeEar: 'left' | 'right';
  onSetThreshold: (freq: number, db: number) => void;
}

export function AudiogramChart({ left, right, activeEar, onSetThreshold }: Props) {
  // Responder API nativa: funziona anche dentro un Modal
  // (GestureDetector di react-native-gesture-handler lì non riceve i tocchi).
  const handleTouch = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    // frequenza più vicina al tocco
    const idx = Math.round(((locationX - PAD_LEFT) / PLOT_W) * (AUDIOGRAM_FREQUENCIES.length - 1));
    const clampedIdx = Math.max(0, Math.min(AUDIOGRAM_FREQUENCIES.length - 1, idx));
    // dB arrotondato ai 5
    const db = DB_MIN + ((locationY - PAD_TOP) / PLOT_H) * (DB_MAX - DB_MIN);
    const clampedDb = Math.max(DB_MIN, Math.min(DB_MAX, Math.round(db / 5) * 5));
    onSetThreshold(AUDIOGRAM_FREQUENCIES[clampedIdx], clampedDb);
  };

  const earPoints = (t: AudiogramThresholds) =>
    AUDIOGRAM_FREQUENCIES.map((f, i) =>
      t[f] != null ? { x: xFor(i), y: yFor(t[f]!), freq: f, db: t[f]! } : null,
    ).filter((p): p is NonNullable<typeof p> => p != null);

  const leftPts = earPoints(left);
  const rightPts = earPoints(right);

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleTouch}
    >
        <Svg width={W} height={H}>
          {/* Griglia orizzontale (dB) */}
          {Array.from({ length: (DB_MAX - DB_MIN) / 10 + 1 }, (_, i) => {
            const db = DB_MIN + i * 10;
            const y = yFor(db);
            return (
              <React.Fragment key={db}>
                <Line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={W - PAD_RIGHT}
                  y2={y}
                  stroke={db === 0 ? COLORS.textMuted : COLORS.border}
                  strokeWidth={db === 0 ? 1.2 : 0.6}
                />
                {db % 20 === 0 && (
                  <SvgText
                    x={PAD_LEFT - 6}
                    y={y + 3.5}
                    fontSize={9}
                    fill={COLORS.textMuted}
                    textAnchor="end"
                  >
                    {db}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}

          {/* Griglia verticale (frequenze) */}
          {AUDIOGRAM_FREQUENCIES.map((f, i) => (
            <React.Fragment key={f}>
              <Line
                x1={xFor(i)}
                y1={PAD_TOP}
                x2={xFor(i)}
                y2={H - PAD_BOTTOM}
                stroke={COLORS.border}
                strokeWidth={0.6}
              />
              <SvgText
                x={xFor(i)}
                y={H - 8}
                fontSize={9}
                fill={COLORS.textMuted}
                textAnchor="middle"
              >
                {freqLabel(f)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Curva orecchio destro (O rossi) */}
          {rightPts.length > 1 && (
            <Polyline
              points={rightPts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={EAR_COLORS.right}
              strokeWidth={activeEar === 'right' ? 2.2 : 1.2}
              opacity={activeEar === 'right' ? 1 : 0.45}
            />
          )}
          {rightPts.map((p) => (
            <Circle
              key={`r-${p.freq}`}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="none"
              stroke={EAR_COLORS.right}
              strokeWidth={2}
              opacity={activeEar === 'right' ? 1 : 0.45}
            />
          ))}

          {/* Curva orecchio sinistro (X blu) */}
          {leftPts.length > 1 && (
            <Polyline
              points={leftPts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={EAR_COLORS.left}
              strokeWidth={activeEar === 'left' ? 2.2 : 1.2}
              opacity={activeEar === 'left' ? 1 : 0.45}
            />
          )}
          {leftPts.map((p) => (
            <React.Fragment key={`l-${p.freq}`}>
              <Line
                x1={p.x - 4.5} y1={p.y - 4.5} x2={p.x + 4.5} y2={p.y + 4.5}
                stroke={EAR_COLORS.left} strokeWidth={2}
                opacity={activeEar === 'left' ? 1 : 0.45}
              />
              <Line
                x1={p.x - 4.5} y1={p.y + 4.5} x2={p.x + 4.5} y2={p.y - 4.5}
                stroke={EAR_COLORS.left} strokeWidth={2}
                opacity={activeEar === 'left' ? 1 : 0.45}
              />
            </React.Fragment>
          ))}
        </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: W,
    height: H,
    alignSelf: 'center',
  },
});
