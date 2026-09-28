import type { DayEntry, Plant, Structure, World } from '@/features/garden';

/**
 * Stable, diff-friendly JSON for world.json: one plant, structure or day per line, keys in a
 * fixed order. A daily commit shows up as one new day line plus the plants the weather changed.
 */

const PLANT_KEYS: (keyof Plant)[] = ['id', 'species', 'x', 'row', 'day', 'stage', 'bloom', 'fruit', 'status', 'fell'];
const STRUCTURE_KEYS: (keyof Structure)[] = ['id', 'type', 'x', 'row', 'day', 'on'];
const DAY_KEYS: (keyof DayEntry)[] = [
  'day',
  'date',
  'action',
  'species',
  'structure',
  'target',
  'x',
  'row',
  'amount',
  'title',
  'lore',
  'source',
  'weather',
];
const WEATHER_KEYS = ['date', 'condition', 'code', 'tmax', 'tmin', 'rain', 'snow', 'sun', 'wind', 'gust', 'fallback'];

function ordered(value: object, keys: readonly string[]): string {
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of keys) {
    const v = record[k];
    if (v === undefined) continue;
    const json = k === 'weather' && v && typeof v === 'object' ? ordered(v, WEATHER_KEYS) : JSON.stringify(v);
    parts.push(`${JSON.stringify(k)}:${json}`);
  }
  return `{${parts.join(',')}}`;
}

function list(items: string[]): string {
  return items.length === 0 ? '[]' : `[\n    ${items.join(',\n    ')}\n  ]`;
}

export function serializeWorld(world: World): string {
  return [
    '{',
    `  "version": ${world.version},`,
    `  "name": ${JSON.stringify(world.name)},`,
    `  "genesis": ${JSON.stringify(world.genesis)},`,
    `  "place": ${ordered(world.place, ['name', 'lat', 'lon'])},`,
    `  "width": ${world.width},`,
    `  "rows": ${world.rows},`,
    `  "nature": ${ordered(world.nature, ['water', 'ice', 'snow'])},`,
    `  "plants": ${list(world.plants.map((p) => ordered(p, PLANT_KEYS)))},`,
    `  "structures": ${list(world.structures.map((s) => ordered(s, STRUCTURE_KEYS)))},`,
    `  "days": ${list(world.days.map((d) => ordered(d, DAY_KEYS)))}`,
    '}',
    '',
  ].join('\n');
}
