import type { MuscleGroup } from '../types';

// Single source of truth for every color the routine editor, the on-screen preview and the
// generated PDF paint with. Everything here resolves to a plain hex string on purpose: the
// same token has to work as a CSS inline style *and* as a jsPDF color argument, and Tailwind
// can't emit classes for values computed at runtime anyway (its scanner only sees literal
// class strings), so nothing in here is ever expressed as a `var(--color-*)` reference.

export const INK = '#1c1c1c';

// Neutral surfaces/text shared by both palettes. Values mirror the Tailwind stone ramp the
// rest of the UI uses, spelled out so the PDF can use the exact same grays as the screen.
export const NEUTRAL = {
  ink: INK,
  text: '#292524',
  muted: '#78716c',
  faintText: '#a8a29e',
  line: '#e7e5e4',
  border: '#d6d3d1',
  surface: '#fafaf9',
  surfaceAlt: '#f5f5f4',
  white: '#ffffff',
} as const;

// Brand accent — buttons, links and the "you can't preview yet" states. The day palette below
// deliberately does *not* use it: structure is colored per day, actions stay red.
export const ACCENT = {
  base: '#dc2626',
  dark: '#b91c1c',
  soft: '#fecaca',
  wash: '#fef2f2',
} as const;

// Index 0 is the warm-up "day" — not a training day, but colored through the same mechanism so
// it doesn't need a hand-built palette of its own. Indices 1-6 are the training days, matching
// the routine's max periodicity of 6 per week.
export const WARMUP_DAY_ID = 0;

export const DAY_BASE_HEX = [
  '#fff2cc',
  '#d9d2e9',
  '#f4cccc',
  '#fce5cd',
  '#c9daf8',
  '#d9ead3',
  '#d0e0e3',
] as const;

// The routine's max periodicity is however many training-day colors exist above (index 0 is
// the warm-up, not a training day) — the periodicity picker reads this instead of a second
// hardcoded number, so the two can't drift apart again.
export const MAX_PERIODICITY = DAY_BASE_HEX.length - 1;

// How far each token is tinted toward white, from the day's base color.
const TINT = {
  base: 0,
  border: 0.3,
  tab: 0.35,
  inner: 0.55,
  faint: 0.82,
  wash: 0.9,
} as const;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0');
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Tints `hex` toward white. `amount` 0 leaves it untouched, 1 returns pure white.
export function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * amount;
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export interface DayPalette {
  /** The day's undiluted pastel — day header in the PDF, active tab in the editor. */
  base: string;
  /** Ink that stays readable on every tone of the scale. */
  ink: string;
  /** Card outlines, cell borders, superset border and superset header. */
  border: string;
  /** Active-tab underline — the one tone darker than `border`. */
  tabAccent: string;
  /** Inner grid lines, muscle-group chips and the video pill. */
  inner: string;
  /** The "Serie / S1…S5" header strip of the set matrix. */
  faint: string;
  /** Backdrop behind a superset block and behind a day's content box. */
  wash: string;
}

// Days are 1-based in the routine model; dayId 0 is the warm-up "day" (see WARMUP_DAY_ID above).
export function dayPalette(dayId: number): DayPalette {
  const base = DAY_BASE_HEX[dayId % DAY_BASE_HEX.length];
  return {
    base: tint(base, TINT.base),
    ink: INK,
    // The warm-up section keeps its border undiluted, per the design, so it reads as fixed and
    // structural rather than scaling with the tint ramp every training day uses.
    border: dayId === WARMUP_DAY_ID ? base : tint(base, TINT.border),
    tabAccent: tint(base, TINT.tab),
    inner: tint(base, TINT.inner),
    faint: tint(base, TINT.faint),
    wash: tint(base, TINT.wash),
  };
}

// Drop-in palette for the warm-up section (mobility / activation / entrada en calor) — just
// dayPalette for dayId 0, kept as a named constant since call sites reach for it directly.
export const WARMUP_PALETTE: DayPalette = dayPalette(WARMUP_DAY_ID);

// ---------------------------------------------------------------------------
// Muscle-group colors — used on the exercise library cards and the exercise picker.
// Inside a routine (editor / preview / PDF) chips take the day tone instead, so the whole
// plan reads as one color per session.
// ---------------------------------------------------------------------------

// Chip background colors as provided by the exercise list ("Color del label" column).
// Text and accent-bar colors are derived by darkening the base hex, rather than mapping to a
// fixed Tailwind color family, since these hexes don't align to Tailwind's palette.
export const MUSCLE_GROUP_COLOR: Record<MuscleGroup, string> = {
  Biceps: '#d0e0e3',
  Espalda: '#9fc5e8',
  Pecho: '#a2c4c9',
  Triceps: '#d9ead3',
  Hombro: '#b6d7a8',
  'Aductores y abductores': '#ffe599',
  Gluteo: '#f9cb9c',
  Gemelos: '#ea9999',
  Isquios: '#dd7e6b',
  Cuadriceps: '#d5a6bd',
  Cardio: '#d9d2e9',
  Movilidad: '#ffd966',
  Activacion: '#cccccc',
  'Ejercicios en Cadena': '#b4a7d6',
};

function hexToHsl(hex: string): [number, number, number] {
  const [r255, g255, b255] = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [h * 60, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = l * 255;
    return `#${toHex(v)}${toHex(v)}${toHex(v)}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hh = h / 360;
  const r = hueToRgb(p, q, hh + 1 / 3);
  const g = hueToRgb(p, q, hh);
  const b = hueToRgb(p, q, hh - 1 / 3);
  return `#${toHex(r * 255)}${toHex(g * 255)}${toHex(b * 255)}`;
}

function darken(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

export function chipBg(group: MuscleGroup): string {
  return MUSCLE_GROUP_COLOR[group];
}

export function chipText(group: MuscleGroup): string {
  return darken(MUSCLE_GROUP_COLOR[group], 0.45);
}

export function accentBar(group: MuscleGroup): string {
  return darken(MUSCLE_GROUP_COLOR[group], 0.2);
}
