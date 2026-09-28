import { applyDay, createGenesis, replay } from './apply';
import { addDays } from './calendar';
import { recommend } from './director';
import { applyWeather } from './effects';
import type { Weather, World } from './schema';

/**
 * Grow a garden with the rule-based director: day i (1-based) uses `weathers[i - 1]`, the
 * weather of the day before. Used for the website's simulated year and for tests.
 */
export function simulate(genesis: string, weathers: readonly Weather[], name?: string): World {
  let world = createGenesis(genesis);
  if (name) world = { ...world, name };
  let garden = replay(world);
  weathers.forEach((weather, index) => {
    const day = index + 1;
    const date = addDays(genesis, day);
    const suggestion = recommend(applyWeather(garden, weather, day, date));
    const result = applyDay(world, { weather, choice: suggestion.choice, source: 'director' }, date, garden);
    world = result.world;
    garden = result.garden;
  });
  return world;
}
