import { groundHeight, waterHeight, WIDTH, type DayEntry, type Garden, type Weather } from '@/features/garden';

/** Geometry of the garden picture: canvas size, rows, the ground line and small path helpers. */

export const SVG_WIDTH = 1024;
export const UNIT = 16;
export const SCENE_HEIGHT = 470;
export const CAPTION_HEIGHT = 96;
export const Y0 = 366;
export const BAND = 26;
export const ROW_T = [-0.65, 0, 0.65] as const;
export const ROW_SCALE = [0.84, 0.92, 1] as const;
export const ROW_HAZE = [0.2, 0.08, 0] as const;
export const PAD = 28;

export interface GardenPicture {
  name: string;
  garden: Garden;
  entry: DayEntry;
  /** Weather of up to the last 30 recorded days, oldest first. */
  recent: (Weather | undefined)[];
  /** 0–1: how green the grass is (rain days of the last three weeks). */
  lush: number;
}

export interface GardenSvgOptions {
  animated?: boolean;
  caption?: boolean;
  /** Mark the element created on this day. */
  highlight?: boolean;
}

export const f = (n: number) => (Math.round(n * 10) / 10).toString();
/** Screen y of the ground at column position x (units) and depth t (−1 back … 1 front). */
export function groundY(x: number, t: number): number {
  return Y0 + t * BAND - groundHeight(x) * UNIT;
}

export function waterLine(level: number, t: number): number | null {
  const h = waterHeight(level);
  return h === null ? null : Y0 + t * BAND - h * UNIT;
}

/** Screen position and unit size of a cell. */
export function cellView(x: number, row: number): { x: number; y: number; unit: number } {
  const t = ROW_T[row] ?? 0;
  return { x: (x + 0.5) * UNIT, y: groundY(x + 0.5, t), unit: UNIT * (ROW_SCALE[row] ?? 1) };
}

export function profile(t: number, from = 0, to = WIDTH, step = 0.5): [number, number][] {
  const points: [number, number][] = [];
  for (let x = from; x <= to + 1e-6; x += step) points.push([x * UNIT, groundY(x, t)]);
  return points;
}

export const poly = (points: [number, number][]) => `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
