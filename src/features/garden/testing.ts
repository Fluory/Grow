import { addDays } from './calendar';
import type { Weather, World } from './schema';
import { simulate } from './simulate';
import { makeWeather, type WeatherValues } from './weather';

/** Test helpers: build weather quickly and grow a garden with the director. */
export function weather(date: string, values: Partial<WeatherValues> = {}): Weather {
  return makeWeather({ date, code: 3, tmax: 15, tmin: 8, rain: 0, snow: 0, sun: 3, wind: 10, gust: 20, ...values });
}

export const RAIN = { rain: 6, sun: 1, code: 61 } as const;
export const SUN = { sun: 10, code: 0 } as const;
export const FROST = { tmin: -3, tmax: 2, code: 0, sun: 7 } as const;

/** Grow `days` days from `genesis` with the director; weather per day from `pickWeather`. */
export function grow(genesis: string, days: number, pickWeather: (date: string, i: number) => Weather): World {
  const weathers = Array.from({ length: days }, (_, k) => pickWeather(addDays(genesis, k), k + 1));
  return simulate(genesis, weathers);
}
