import { WIDTH } from './schema';

/**
 * The ground profile. Heights are in garden units (1 unit = 1 column). The garden is flat
 * with a low hill in the west; the stream runs through a channel near the eastern end and
 * crosses all three rows. Rain raises the water, sun lowers it – because the channel is a
 * trough, higher water is also wider water ("rivers widen"), and low water exposes sand
 * banks ("beaches grow").
 */

export const CHANNEL = { center: 44, halfWidth: 6.5, depth: 2.4 } as const;
export const HILL = { center: 10, halfWidth: 9, height: 1.1 } as const;
/** Columns at the edges stay empty so nothing is cut off in the picture. */
export const MARGIN = 1;
export const MAX_WATER = 8;

export type Zone = 'meadow' | 'bank' | 'beach' | 'water';

/** Ground height at a continuous position (column i spans [i, i + 1)). */
export function groundHeight(x: number): number {
  let h = 0;
  const dh = (x - HILL.center) / HILL.halfWidth;
  if (Math.abs(dh) < 1) h += HILL.height * (0.5 + 0.5 * Math.cos(Math.PI * dh));
  const dc = (x - CHANNEL.center) / CHANNEL.halfWidth;
  if (Math.abs(dc) < 1) h -= CHANNEL.depth * (0.5 + 0.5 * Math.cos(Math.PI * dc));
  return h;
}

/** Height of the column's centre. */
export function columnHeight(col: number): number {
  return groundHeight(col + 0.5);
}

/** Water surface height for a level 1–8; level 0 means a dry bed. */
export function waterHeight(level: number): number | null {
  if (level <= 0) return null;
  return -CHANNEL.depth + 0.25 + (Math.min(level, MAX_WATER) - 1) * 0.28;
}

export function isChannel(col: number): boolean {
  return Math.abs(col + 0.5 - CHANNEL.center) < CHANNEL.halfWidth - 0.25;
}

/** Water depth at a column for a level (0 when dry). */
export function waterDepth(col: number, level: number): number {
  const surface = waterHeight(level);
  if (surface === null) return 0;
  return Math.max(0, surface - columnHeight(col));
}

export function isWater(col: number, level: number): boolean {
  return waterDepth(col, level) > 0.05;
}

/** First and last water column for a level, or null when the bed is dry. */
export function waterSpan(level: number): [number, number] | null {
  let first = -1;
  let last = -1;
  for (let col = 0; col < WIDTH; col++) {
    if (!isWater(col, level)) continue;
    if (first < 0) first = col;
    last = col;
  }
  return first < 0 ? null : [first, last];
}

/** Exact x positions where the water surface meets the banks (for drawing). */
export function waterEdges(level: number): [number, number] | null {
  const surface = waterHeight(level);
  if (surface === null) return null;
  const solve = (from: number, to: number) => {
    let a = from;
    let b = to;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (groundHeight(m) < surface === groundHeight(a) < surface) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  return [
    solve(CHANNEL.center - CHANNEL.halfWidth, CHANNEL.center),
    solve(CHANNEL.center, CHANNEL.center + CHANNEL.halfWidth),
  ];
}

export function zoneOf(col: number, level: number): Zone {
  if (isWater(col, level)) return 'water';
  if (isChannel(col)) return 'beach';
  const distance = Math.abs(col + 0.5 - CHANNEL.center) - CHANNEL.halfWidth;
  if (distance < 3.5) return 'bank';
  return 'meadow';
}

export function inGarden(col: number): boolean {
  return col >= MARGIN && col < WIDTH - MARGIN;
}
