import type { Nature, Plant, Structure, Weather } from './schema';
import { SPECIES } from './species';
import { footprint } from './structures';
import { zoneOf, type Zone } from './terrain';

/**
 * The garden on one day – what replaying the day log produces. Pure data; every change
 * goes through `applyWeather` (nature) and `applyChoice` (the gardener).
 */

export interface Stats {
  rainDays: number;
  sunDays: number;
  cloudyDays: number;
  frostDays: number;
  snowDays: number;
  stormDays: number;
  /** Total rain in mm (one decimal). */
  rainTotal: number;
  harvested: number;
  fallen: number;
  watered: number;
}

export interface Garden {
  day: number;
  date: string;
  /** The weather that shaped this day (absent on day 0). */
  weather?: Weather;
  nature: Nature;
  plants: Plant[];
  structures: Structure[];
  /** What nature did today, in plain sentences. */
  effects: string[];
  stats: Stats;
  lastFall: number | null;
  nextPlant: number;
  nextStructure: number;
}

export const EMPTY_STATS: Stats = {
  rainDays: 0,
  sunDays: 0,
  cloudyDays: 0,
  frostDays: 0,
  snowDays: 0,
  stormDays: 0,
  rainTotal: 0,
  harvested: 0,
  fallen: 0,
  watered: 0,
};

export function cloneGarden(g: Garden): Garden {
  return {
    ...g,
    nature: { ...g.nature },
    plants: g.plants.map((p) => ({ ...p })),
    structures: g.structures.map((s) => ({ ...s })),
    effects: [...g.effects],
    stats: { ...g.stats },
  };
}

export interface Cell {
  x: number;
  row: number;
}

/** Distance between cells; rows are 1.5 columns apart. */
export function distance(a: Cell, b: Cell): number {
  return Math.hypot(a.x - b.x, (a.row - b.row) * 1.5);
}

export function zoneAt(g: Garden, x: number): Zone {
  return zoneOf(x, g.nature.water);
}

/** Growth 0–1 of a plant (fully grown = 1). */
export function growth(p: Plant): number {
  return Math.min(1, p.stage / SPECIES[p.species].maxStage);
}

export function isAlive(p: Plant): boolean {
  return p.status === 'growing';
}

export function isTree(p: Plant): boolean {
  return SPECIES[p.species].kind === 'tree';
}

export function plantById(g: Garden, id: string): Plant | undefined {
  return g.plants.find((p) => p.id === id);
}

/** Cells taken by channel structures (they lie across the stream). */
function channelCells(s: Structure): Cell[] {
  if (s.type !== 'stepping' && s.type !== 'bridge') return [];
  return [-2, -1, 0, 1, 2].map((dx) => ({ x: s.x + dx, row: s.row }));
}

/** What occupies a cell: a plant, a structure or nothing. Birdhouses hang in trees. */
export function occupant(g: Garden, x: number, row: number): Plant | Structure | null {
  const plant = g.plants.find((p) => p.x === x && p.row === row);
  if (plant) return plant;
  for (const s of g.structures) {
    if (s.type === 'birdhouse') continue;
    if (s.row === row && footprint(s.type, s.x).includes(x)) return s;
    if (channelCells(s).some((c) => c.x === x && c.row === row)) return s;
  }
  return null;
}

export function isFree(g: Garden, x: number, row: number): boolean {
  return occupant(g, x, row) === null;
}

export function countStructures(g: Garden, type: Structure['type']): number {
  return g.structures.filter((s) => s.type === type).length;
}
