import type { SpeciesId } from './schema';
import type { Zone } from './terrain';

/**
 * The plants of the garden. Every number here is a world rule: RULES.md is generated from
 * this table, the engine enforces it and the renderer draws from it.
 */

export type Kind = 'tree' | 'shrub' | 'flower' | 'water' | 'fungus';
export type Life = 'tree' | 'perennial' | 'annual' | 'bulb';
export type Needs = 'sun' | 'shade' | 'wood';

export interface Cycle {
  /** Months (1–12) in which sunny days add to it. */
  months: readonly number[];
  /** Most blossoms / fruit at once. */
  max: number;
  /** Minimum growth stage. */
  from: number;
}

export interface SpeciesInfo {
  id: SpeciesId;
  label: string;
  plural: string;
  kind: Kind;
  life: Life;
  /** Keeps its leaves in winter. */
  evergreen: boolean;
  /** Fully grown. Rain adds one stage per day (two on heavy rain), watering one. */
  maxStage: number;
  /** Height when fully grown, in garden units. */
  height: number;
  /** Minimum distance to other trees (trees) or shrubs (shrubs). */
  spacing: number;
  zones: readonly Zone[];
  /** Months in which it may be planted. */
  sow: readonly number[];
  /** Months in which rain makes it grow. */
  grows: readonly number[];
  bloom?: Cycle;
  fruit?: Cycle & { label: string };
  needs?: Needs;
  /** Hard cap in the garden, if any. */
  limit?: number;
}

/** Trees keep this many columns from the edge of the garden so their crowns fit. */
export const TREE_MARGIN = 4;

const SEASON_GROWTH = [3, 4, 5, 6, 7, 8, 9, 10] as const;
const ALL_YEAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const SPECIES: Record<SpeciesId, SpeciesInfo> = {
  oak: {
    id: 'oak',
    label: 'oak',
    plural: 'oaks',
    kind: 'tree',
    life: 'tree',
    evergreen: false,
    maxStage: 110,
    height: 13,
    spacing: 6,
    zones: ['meadow', 'bank'],
    sow: [3, 4, 10, 11],
    grows: SEASON_GROWTH,
  },
  birch: {
    id: 'birch',
    label: 'birch',
    plural: 'birches',
    kind: 'tree',
    life: 'tree',
    evergreen: false,
    maxStage: 90,
    height: 12,
    spacing: 5,
    zones: ['meadow', 'bank'],
    sow: [3, 4, 10, 11],
    grows: SEASON_GROWTH,
  },
  pine: {
    id: 'pine',
    label: 'pine',
    plural: 'pines',
    kind: 'tree',
    life: 'tree',
    evergreen: true,
    maxStage: 100,
    height: 11.5,
    spacing: 5,
    zones: ['meadow'],
    sow: [3, 4, 9, 10, 11],
    grows: ALL_YEAR,
  },
  apple: {
    id: 'apple',
    label: 'apple tree',
    plural: 'apple trees',
    kind: 'tree',
    life: 'tree',
    evergreen: false,
    maxStage: 80,
    height: 7,
    spacing: 6,
    zones: ['meadow'],
    sow: [3, 4, 10, 11],
    grows: SEASON_GROWTH,
    bloom: { months: [4, 5], max: 40, from: 24 },
    fruit: { months: [8, 9, 10], max: 16, from: 30, label: 'apples' },
  },
  willow: {
    id: 'willow',
    label: 'willow',
    plural: 'willows',
    kind: 'tree',
    life: 'tree',
    evergreen: false,
    maxStage: 90,
    height: 10,
    spacing: 6,
    zones: ['bank'],
    sow: [3, 4, 5, 10, 11],
    grows: SEASON_GROWTH,
  },
  lavender: {
    id: 'lavender',
    label: 'lavender',
    plural: 'lavender bushes',
    kind: 'shrub',
    life: 'perennial',
    evergreen: true,
    maxStage: 12,
    height: 1.5,
    spacing: 2,
    zones: ['meadow'],
    sow: [4, 5, 6, 9],
    grows: [4, 5, 6, 7, 8, 9],
    bloom: { months: [6, 7, 8], max: 14, from: 5 },
    needs: 'sun',
  },
  fern: {
    id: 'fern',
    label: 'fern',
    plural: 'ferns',
    kind: 'shrub',
    life: 'perennial',
    evergreen: false,
    maxStage: 10,
    height: 1.3,
    spacing: 2,
    zones: ['meadow', 'bank'],
    sow: [3, 4, 5, 9, 10],
    grows: [4, 5, 6, 7, 8, 9],
    needs: 'shade',
  },
  reed: {
    id: 'reed',
    label: 'reed',
    plural: 'reeds',
    kind: 'water',
    life: 'perennial',
    evergreen: false,
    maxStage: 12,
    height: 3,
    spacing: 1,
    zones: ['beach', 'bank'],
    sow: [3, 4, 5, 6, 7, 8, 9],
    grows: [4, 5, 6, 7, 8, 9],
    bloom: { months: [7, 8, 9, 10], max: 4, from: 6 },
  },
  sunflower: {
    id: 'sunflower',
    label: 'sunflower',
    plural: 'sunflowers',
    kind: 'flower',
    life: 'annual',
    evergreen: false,
    maxStage: 14,
    height: 3.6,
    spacing: 1,
    zones: ['meadow', 'bank'],
    sow: [4, 5, 6, 7],
    grows: [4, 5, 6, 7, 8, 9, 10],
    bloom: { months: [7, 8, 9], max: 1, from: 9 },
    fruit: { months: [9, 10], max: 1, from: 12, label: 'seed heads' },
    needs: 'sun',
  },
  poppy: {
    id: 'poppy',
    label: 'poppy',
    plural: 'poppies',
    kind: 'flower',
    life: 'annual',
    evergreen: false,
    maxStage: 7,
    height: 1.2,
    spacing: 1,
    zones: ['meadow', 'bank'],
    sow: [3, 4, 5, 9, 10],
    grows: SEASON_GROWTH,
    bloom: { months: [5, 6, 7], max: 4, from: 4 },
  },
  tulip: {
    id: 'tulip',
    label: 'tulip',
    plural: 'tulips',
    kind: 'flower',
    life: 'bulb',
    evergreen: false,
    maxStage: 7,
    height: 1,
    spacing: 1,
    zones: ['meadow', 'bank'],
    sow: [9, 10, 11],
    grows: [2, 3, 4, 5],
    bloom: { months: [4, 5], max: 1, from: 5 },
  },
  waterlily: {
    id: 'waterlily',
    label: 'water lily',
    plural: 'water lilies',
    kind: 'water',
    life: 'perennial',
    evergreen: false,
    maxStage: 8,
    height: 0.2,
    spacing: 2,
    zones: ['water'],
    sow: [4, 5, 6, 7, 8],
    grows: [5, 6, 7, 8, 9],
    bloom: { months: [6, 7, 8], max: 3, from: 4 },
    limit: 4,
  },
  mushroom: {
    id: 'mushroom',
    label: 'mushroom',
    plural: 'mushrooms',
    kind: 'fungus',
    life: 'perennial',
    evergreen: false,
    maxStage: 4,
    height: 0.5,
    spacing: 1,
    zones: ['meadow', 'bank'],
    sow: [9, 10, 11],
    grows: [9, 10, 11],
    needs: 'wood',
    limit: 6,
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar–May, Sep–Oct" */
export function monthRange(months: readonly number[]): string {
  if (months.length === 12) return 'all year';
  const sorted = [...months].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const m of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[1] === m - 1) last[1] = m;
    else runs.push([m, m]);
  }
  return runs
    .map(([a, b]) => (a === b ? MONTH_NAMES[a - 1] : `${MONTH_NAMES[a - 1]}–${MONTH_NAMES[b - 1]}`))
    .join(', ');
}

export const NEEDS_TEXT: Record<Needs, string> = {
  sun: 'full sun – no grown tree within three columns',
  shade: 'shade – a tree of stage 16 or more within four columns',
  wood: 'wood – a fallen log or a tree of stage 24 or more within three columns',
};

export const ZONE_TEXT: Record<Zone, string> = {
  meadow: 'the meadow',
  bank: 'the stream bank',
  beach: 'the sand bank',
  water: 'the stream (at least half a unit deep)',
};

/** One sentence per species for RULES.md and the plan. */
export function speciesRule(info: SpeciesInfo): string {
  const where = info.zones.map((z) => ZONE_TEXT[z]).join(' or ');
  const parts = [`planted ${monthRange(info.sow)} on ${where}`, `grows on rain in ${monthRange(info.grows)}`];
  parts.push(`fully grown at stage ${info.maxStage}`);
  if (info.kind === 'tree')
    parts.push(`${info.spacing} columns from other trees and ${TREE_MARGIN} from the garden's edge`);
  if (info.kind === 'shrub') parts.push(`${info.spacing} columns from other shrubs`);
  if (info.needs) parts.push(`needs ${NEEDS_TEXT[info.needs]}`);
  if (info.bloom) parts.push(`blooms in the sun ${monthRange(info.bloom.months)} from stage ${info.bloom.from}`);
  if (info.fruit) parts.push(`${info.fruit.label} ripen in the sun ${monthRange(info.fruit.months)}`);
  if (info.life === 'annual') parts.push('wilts at the first frost');
  if (info.limit) parts.push(`at most ${info.limit}`);
  return parts.join('; ') + '.';
}
