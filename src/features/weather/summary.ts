import { describeWeather, type Condition, type Weather } from '@/features/garden';

/** Plain numbers about a run of weather days – stat tiles, table and chart labels use them. */

export interface WeatherSummary {
  days: number;
  counts: Record<Condition, number>;
  rainTotal: number;
  wettest: Weather | null;
  warmest: Weather | null;
  coldest: Weather | null;
  windiest: Weather | null;
  sunHours: number;
}

export function summarize(list: readonly Weather[]): WeatherSummary {
  const counts: Record<Condition, number> = { sun: 0, cloudy: 0, rain: 0, frost: 0, snow: 0, storm: 0 };
  let rainTotal = 0;
  let sunHours = 0;
  let wettest: Weather | null = null;
  let warmest: Weather | null = null;
  let coldest: Weather | null = null;
  let windiest: Weather | null = null;
  for (const w of list) {
    counts[w.condition]++;
    rainTotal += w.rain;
    sunHours += w.sun;
    if (!wettest || w.rain > wettest.rain) wettest = w;
    if (!warmest || w.tmax > warmest.tmax) warmest = w;
    if (!coldest || w.tmin < coldest.tmin) coldest = w;
    if (!windiest || w.gust > windiest.gust) windiest = w;
  }
  return {
    days: list.length,
    counts,
    rainTotal: Math.round(rainTotal * 10) / 10,
    wettest,
    warmest,
    coldest,
    windiest,
    sunHours: Math.round(sunHours),
  };
}

/** Rain bins of the calendar: dry, then four steps of one blue ramp. */
export const RAIN_BINS = [0.1, 1, 5, 10] as const;

export function rainBin(mm: number): 0 | 1 | 2 | 3 | 4 {
  if (mm < RAIN_BINS[0]) return 0;
  if (mm < RAIN_BINS[1]) return 1;
  if (mm < RAIN_BINS[2]) return 2;
  if (mm < RAIN_BINS[3]) return 3;
  return 4;
}

export { describeWeather };
