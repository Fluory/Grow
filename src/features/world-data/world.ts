import worldJson from '../../../world/world.json';
import {
  gardenStats,
  makeWeather,
  parseWorld,
  simulate,
  timeline,
  type DayEntry,
  type Garden,
  type Weather,
  type World,
} from '@/features/garden';
import weatherYear from './weather-year.json';

/**
 * Build-time access to the garden. world.json is bundled into the server build, so every
 * deployment (one per daily commit) renders exactly the state of that commit.
 */

let cached: World | undefined;
let cachedTimeline: Garden[] | undefined;

export function getWorld(): World {
  cached ??= parseWorld(worldJson);
  return cached;
}

/** The garden after every recorded day, oldest first. */
export function getTimeline(): Garden[] {
  cachedTimeline ??= timeline(getWorld());
  return cachedTimeline;
}

export function getStats() {
  const gardens = getTimeline();
  return gardenStats(getWorld(), gardens[gardens.length - 1]);
}

export function getLatest(): DayEntry {
  const days = getWorld().days;
  return days[days.length - 1] as DayEntry;
}

/** Newest first. */
export function getDaysNewestFirst(): DayEntry[] {
  return [...getWorld().days].reverse();
}

export function getDay(day: number): DayEntry | undefined {
  return getWorld().days.find((d) => d.day === day);
}

type Row = [string, number, number, number, number, number, number, number, number];

/** A year of real Heilbronn weather (28 Sep 2025 – 26 Sep 2026, Open-Meteo, CC BY 4.0). */
export function getWeatherYear(): Weather[] {
  return (weatherYear.days as Row[]).map(([date, code, tmax, tmin, rain, snow, sun, wind, gust]) =>
    makeWeather({ date, code, tmax, tmin, rain, snow, sun, wind, gust }),
  );
}

export const SIMULATION_GENESIS = '2025-09-28';
let simulated: World | undefined;

/**
 * A simulated first year: the rule-based director gardens under a real past year of Heilbronn
 * weather. Clearly labelled on the website – it shows what the rules can grow, not the real garden.
 */
export function getSimulation(): World {
  simulated ??= simulate(SIMULATION_GENESIS, getWeatherYear(), 'Grow (simulation)');
  return simulated;
}
