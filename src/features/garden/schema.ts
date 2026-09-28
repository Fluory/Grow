import { z } from 'zod';
import { isIsoDate } from './calendar';

/**
 * The garden model. `world/world.json` is the single source of truth: the day log (weather +
 * the gardener's one action per day) plus a snapshot of the current garden. The snapshot is
 * always what replaying the day log produces – `npm run world:check` proves it.
 *
 * The garden is a strip of 64 columns (x, west → east) and three rows (0 = back, 2 = front).
 * A stream crosses it from back to front near the eastern end.
 */

export const WIDTH = 64;
export const ROWS = 3;
export const ROW_NAMES = ['back', 'middle', 'front'] as const;

/** Where the weather comes from. */
export const PLACE = { name: 'Heilbronn', lat: 49.1427, lon: 9.2109 } as const;

export const CONDITIONS = ['sun', 'cloudy', 'rain', 'frost', 'snow', 'storm'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const SPECIES_IDS = [
  'oak',
  'birch',
  'pine',
  'apple',
  'willow',
  'lavender',
  'fern',
  'reed',
  'sunflower',
  'poppy',
  'tulip',
  'waterlily',
  'mushroom',
] as const;
export type SpeciesId = (typeof SPECIES_IDS)[number];

/** Structures the gardener can build. */
export const BUILDABLES = [
  'stone',
  'bench',
  'birdhouse',
  'beehive',
  'stepping',
  'bridge',
  'lantern',
  'shed',
  'barrel',
  'sundial',
  'scarecrow',
  'snowman',
] as const;
export type Buildable = (typeof BUILDABLES)[number];

/** Everything that can stand in the garden – the paper boat only ever arrives with a storm. */
export const STRUCTURE_TYPES = [...BUILDABLES, 'boat'] as const;
export type StructureType = (typeof STRUCTURE_TYPES)[number];

export const ACTIONS = ['genesis', 'plant', 'build', 'water', 'harvest', 'rest'] as const;
export type Action = (typeof ACTIONS)[number];

export const PLANT_STATUS = ['growing', 'wilted', 'fallen'] as const;
export type PlantStatus = (typeof PLANT_STATUS)[number];

const isoDate = z.string().refine(isIsoDate, 'expected a date as YYYY-MM-DD');
const column = z
  .number()
  .int()
  .min(0)
  .max(WIDTH - 1);
const row = z
  .number()
  .int()
  .min(0)
  .max(ROWS - 1);

/** One observed day of weather in Heilbronn (Open-Meteo, daily aggregates). */
export const WeatherSchema = z
  .object({
    date: isoDate,
    code: z.number().int().min(0).max(99),
    tmax: z.number().min(-45).max(50),
    tmin: z.number().min(-45).max(50),
    rain: z.number().min(0).max(500),
    snow: z.number().min(0).max(300),
    sun: z.number().min(0).max(24),
    wind: z.number().min(0).max(400),
    gust: z.number().min(0).max(400),
    condition: z.enum(CONDITIONS),
    fallback: z.literal(true).optional(),
  })
  .strict();

export const PlantSchema = z
  .object({
    id: z.string().regex(/^p\d+$/),
    species: z.enum(SPECIES_IDS),
    x: column,
    row,
    day: z.number().int().min(0),
    stage: z.number().int().min(0),
    bloom: z.number().int().min(0),
    fruit: z.number().int().min(0),
    status: z.enum(PLANT_STATUS),
    fell: z.number().int().min(0).optional(),
  })
  .strict();

export const StructureSchema = z
  .object({
    id: z.string().regex(/^s\d+$/),
    type: z.enum(STRUCTURE_TYPES),
    x: column,
    row,
    day: z.number().int().min(0),
    on: z.string().optional(),
  })
  .strict();

export const NatureSchema = z
  .object({
    water: z.number().int().min(0).max(8),
    ice: z.boolean(),
    snow: z.number().int().min(0).max(3),
  })
  .strict();

export const DayEntrySchema = z
  .object({
    day: z.number().int().min(0),
    date: isoDate,
    action: z.enum(ACTIONS),
    species: z.enum(SPECIES_IDS).optional(),
    structure: z.enum(BUILDABLES).optional(),
    target: z.string().optional(),
    x: column.optional(),
    row: row.optional(),
    amount: z.number().int().min(0).optional(),
    title: z.string().min(3).max(80),
    lore: z.string().min(3).max(200),
    source: z.enum(['genesis', 'claude', 'director']),
    weather: WeatherSchema.optional(),
  })
  .strict();

export const WorldSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1),
    genesis: isoDate,
    place: z.object({ name: z.string(), lat: z.number(), lon: z.number() }).strict(),
    width: z.literal(WIDTH),
    rows: z.literal(ROWS),
    nature: NatureSchema,
    plants: z.array(PlantSchema),
    structures: z.array(StructureSchema),
    days: z.array(DayEntrySchema).min(1),
  })
  .strict();

export type Weather = z.infer<typeof WeatherSchema>;
export type Plant = z.infer<typeof PlantSchema>;
export type Structure = z.infer<typeof StructureSchema>;
export type Nature = z.infer<typeof NatureSchema>;
export type DayEntry = z.infer<typeof DayEntrySchema>;
export type World = z.infer<typeof WorldSchema>;

export function parseWorld(input: unknown): World {
  return WorldSchema.parse(input);
}

export function isSpecies(value: string): value is SpeciesId {
  return (SPECIES_IDS as readonly string[]).includes(value);
}

export function isBuildable(value: string): value is Buildable {
  return (BUILDABLES as readonly string[]).includes(value);
}
