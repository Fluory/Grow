import {
  CHANNEL,
  groundHeight,
  timeline,
  type Condition,
  type DayEntry,
  type Garden,
  type World,
} from '@/features/garden';

/** World ↔ scene coordinates and cached garden timelines. One garden unit = one scene unit. */

export const DEPTH = 9;
export const ROW_Z = [-2.8, 0, 2.8] as const;
export const SOIL_BOTTOM = -4.2;
export const HALF = 32;

export const sceneX = (col: number) => col + 0.5 - HALF;
export const rowZ = (row: number) => ROW_Z[row] ?? 0;
export const groundAt = (col: number) => groundHeight(col + 0.5);
export const CHANNEL_X = CHANNEL.center - HALF;

const timelines = new WeakMap<World, Garden[]>();

export function gardensOf(world: World): Garden[] {
  let list = timelines.get(world);
  if (!list) {
    list = timeline(world);
    timelines.set(world, list);
  }
  return list;
}

/** Index of the last day entry whose day number is ≤ `day`. */
export function indexAt(world: World, day: number): number {
  const days = world.days;
  if (!Number.isFinite(day)) return days.length - 1;
  let lo = 0;
  let hi = days.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((days[mid] as DayEntry).day <= day) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function lastDay(world: World): number {
  return world.days[world.days.length - 1]?.day ?? 0;
}

export function conditionAt(world: World, day: number): Condition | undefined {
  return world.days[indexAt(world, day)]?.weather?.condition;
}
