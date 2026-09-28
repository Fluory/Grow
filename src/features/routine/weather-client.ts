import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { openMeteoUrl, parseOpenMeteo, WeatherSchema, type Weather, type World } from '@/features/garden';
import { abs } from './files';

/**
 * Yesterday's weather for the routine. Fetched once from Open-Meteo and cached in tmp/ so
 * `plan` and `apply` see exactly the same numbers. If the service cannot be reached the last
 * recorded weather is repeated and marked `fallback` – the garden never skips a day.
 */

const cachePath = (date: string) => abs(`tmp/weather-${date}.json`);

async function fetchDay(date: string): Promise<Weather> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(openMeteoUrl(date), { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const day = parseOpenMeteo(await res.json()).find((w) => w.date === date);
      if (!day) throw new Error(`no complete data for ${date}`);
      return day;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`weather service unreachable: ${(lastError as Error)?.message ?? lastError}`);
}

/** The repeated weather used when the service is down. */
export function fallbackWeather(world: World, date: string): Weather {
  const last = [...world.days].reverse().find((d) => d.weather)?.weather;
  const base: Weather = last ?? {
    date,
    code: 3,
    tmax: 12,
    tmin: 6,
    rain: 0,
    snow: 0,
    sun: 2,
    wind: 8,
    gust: 18,
    condition: 'cloudy',
  };
  return { ...base, date, fallback: true };
}

export interface WeatherResult {
  weather: Weather;
  source: 'cache' | 'open-meteo' | 'fallback' | 'file';
  error?: string;
}

/** Load the weather of `observed` (normally yesterday): cache → Open-Meteo → fallback. */
export async function loadWeather(world: World, observed: string, file?: string): Promise<WeatherResult> {
  if (file) return { weather: WeatherSchema.parse(JSON.parse(readFileSync(file, 'utf8'))), source: 'file' };
  const cache = cachePath(observed);
  if (existsSync(cache))
    return { weather: WeatherSchema.parse(JSON.parse(readFileSync(cache, 'utf8'))), source: 'cache' };
  let result: WeatherResult;
  try {
    result = { weather: await fetchDay(observed), source: 'open-meteo' };
  } catch (error) {
    result = { weather: fallbackWeather(world, observed), source: 'fallback', error: (error as Error).message };
  }
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, `${JSON.stringify(result.weather, null, 2)}\n`);
  return result;
}
