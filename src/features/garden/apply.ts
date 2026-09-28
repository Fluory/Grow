import { daysBetween } from './calendar';
import { applyWeather } from './effects';
import { EMPTY_STATS, type Garden } from './garden';
import { autoLore, autoTitle, checkText } from './lore';
import { applyChoice, checkChoice, type Choice } from './rules';
import { PLACE, ROWS, WIDTH, type DayEntry, type Weather, type World } from './schema';

export const GENESIS_TITLE = 'An empty garden bed by a stream';
export const GENESIS_LORE =
  'Dark soil, a trickle of water and one question: what will the weather in Heilbronn make of it?';
export const START_WATER = 3;

/** A choice or text that breaks a world rule – the CLI exits with code 2. */
export class WorldRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorldRuleError';
  }
}

export function emptyGarden(genesis: string): Garden {
  return {
    day: 0,
    date: genesis,
    nature: { water: START_WATER, ice: false, snow: 0 },
    plants: [],
    structures: [],
    effects: [],
    stats: { ...EMPTY_STATS },
    lastFall: null,
    nextPlant: 1,
    nextStructure: 1,
  };
}

export function createGenesis(date: string): World {
  return {
    version: 1,
    name: 'Grow',
    genesis: date,
    place: { ...PLACE },
    width: WIDTH,
    rows: ROWS,
    nature: { water: START_WATER, ice: false, snow: 0 },
    plants: [],
    structures: [],
    days: [{ day: 0, date, action: 'genesis', title: GENESIS_TITLE, lore: GENESIS_LORE, source: 'genesis' }],
  };
}

/** The choice recorded in a day entry. */
export function choiceOf(entry: DayEntry): Choice {
  switch (entry.action) {
    case 'plant':
      if (!entry.species || entry.x === undefined || entry.row === undefined) break;
      return { action: 'plant', species: entry.species, x: entry.x, row: entry.row };
    case 'build':
      if (!entry.structure || entry.x === undefined || entry.row === undefined) break;
      return { action: 'build', structure: entry.structure, x: entry.x, row: entry.row };
    case 'water':
    case 'harvest':
      if (!entry.target) break;
      return { action: entry.action, target: entry.target };
    case 'rest':
      return { action: 'rest' };
    case 'genesis':
      break;
  }
  throw new WorldRuleError(`day ${entry.day}: incomplete "${entry.action}" entry`);
}

/** Replay the day log. `upTo` stops after that day; every recorded choice is re-checked. */
export function replay(world: World, upTo = Infinity): Garden {
  let g = emptyGarden(world.genesis);
  for (const entry of world.days) {
    if (entry.day > upTo) break;
    g = step(g, entry);
  }
  return g;
}

/** The garden after every day entry, oldest first – one pass for timelines. */
export function timeline(world: World): Garden[] {
  const out: Garden[] = [];
  let g = emptyGarden(world.genesis);
  for (const entry of world.days) {
    g = step(g, entry);
    out.push(g);
  }
  return out;
}

function step(g: Garden, entry: DayEntry): Garden {
  if (entry.action === 'genesis') return { ...g, day: entry.day, date: entry.date };
  const afterWeather = applyWeather(g, entry.weather, entry.day, entry.date);
  const choice = choiceOf(entry);
  const reason = checkChoice(afterWeather, choice);
  if (reason) throw new WorldRuleError(`day ${entry.day}: ${reason}`);
  const outcome = applyChoice(afterWeather, choice);
  if (outcome.target !== entry.target)
    throw new WorldRuleError(
      `day ${entry.day}: replay produced ${outcome.target ?? 'nothing'}, log says ${entry.target}`,
    );
  return outcome.garden;
}

export interface DayInput {
  weather: Weather;
  choice: Choice;
  title?: string;
  lore?: string;
  source: 'claude' | 'director';
}

export interface DayResult {
  world: World;
  garden: Garden;
  entry: DayEntry;
}

/**
 * Record one day: the weather acts, then the one choice. Pure – throws `WorldRuleError`.
 * `previous` may pass the already replayed garden (simulations); it must match `world`.
 */
export function applyDay(world: World, input: DayInput, date: string, previous?: Garden): DayResult {
  const day = daysBetween(world.genesis, date);
  const last = world.days[world.days.length - 1];
  if (!last || day <= last.day) throw new WorldRuleError(`day ${day} (${date}) is already recorded`);
  if (input.weather.date >= date) throw new WorldRuleError(`the weather of ${input.weather.date} has not happened yet`);

  const afterWeather = applyWeather(previous ?? replay(world), input.weather, day, date);
  const reason = checkChoice(afterWeather, input.choice);
  if (reason) throw new WorldRuleError(reason);
  const outcome = applyChoice(afterWeather, input.choice);

  const title = (input.title ?? autoTitle(afterWeather, input.choice, outcome.amount)).trim();
  const lore = (input.lore ?? autoLore(afterWeather, input.choice)).trim();
  const problem = checkText('title', title) ?? checkText('lore', lore);
  if (problem) throw new WorldRuleError(problem);

  const c = input.choice;
  const entry: DayEntry = {
    day,
    date,
    action: c.action,
    ...(c.action === 'plant' ? { species: c.species, x: c.x, row: c.row } : {}),
    ...(c.action === 'build' ? { structure: c.structure, x: c.x, row: c.row } : {}),
    ...(outcome.target ? { target: outcome.target } : {}),
    ...(c.action === 'harvest' ? { amount: outcome.amount ?? 0 } : {}),
    title,
    lore,
    source: input.source,
    weather: input.weather,
  };
  const garden = outcome.garden;
  return {
    world: {
      ...world,
      nature: { ...garden.nature },
      plants: garden.plants,
      structures: garden.structures,
      days: [...world.days, entry],
    },
    garden,
    entry,
  };
}
