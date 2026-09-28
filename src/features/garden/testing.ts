import { applyDay, createGenesis, replay } from './apply';
import { addDays } from './calendar';
import { recommend } from './director';
import { applyWeather } from './effects';
import type { Garden } from './garden';
import { options } from './rules';
import type { Weather, World } from './schema';
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
  let world = createGenesis(genesis);
  let g: Garden = replay(world);
  for (let i = 1; i <= days; i++) {
    const date = addDays(genesis, i);
    const w = pickWeather(addDays(date, -1), i);
    const s = recommend(applyWeather(g, w, i, date));
    const result = applyDay(world, { weather: w, choice: s.choice, source: 'director' }, date, g);
    world = result.world;
    g = result.garden;
  }
  return world;
}

export { options };
