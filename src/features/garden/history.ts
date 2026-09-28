import { addDays, daysBetween } from './calendar';
import { replay } from './apply';
import { WorldSchema, type World } from './schema';

/**
 * `npm run world:check`: the world file must parse, the day log must be consistent and the
 * stored snapshot must be exactly what replaying the log produces.
 */
export function validateWorld(input: unknown): string[] {
  const parsed = WorldSchema.safeParse(input);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  const world: World = parsed.data;
  const errors: string[] = [];

  const first = world.days[0];
  if (!first || first.action !== 'genesis' || first.day !== 0 || first.date !== world.genesis)
    errors.push('the log must start with the genesis entry (day 0 on the genesis date)');
  world.days.forEach((d, i) => {
    if (i > 0 && d.action === 'genesis') errors.push(`day ${d.day}: only day 0 may be the genesis`);
    if (d.day !== daysBetween(world.genesis, d.date)) errors.push(`day ${d.day}: date ${d.date} does not match`);
    const prev = world.days[i - 1];
    if (prev && d.day <= prev.day) errors.push(`day ${d.day}: days must be strictly increasing`);
    if (d.action !== 'genesis') {
      if (!d.weather) errors.push(`day ${d.day}: weather is missing`);
      else if (d.weather.date >= d.date || d.weather.date < addDays(d.date, -7))
        errors.push(`day ${d.day}: weather date ${d.weather.date} must be within the week before ${d.date}`);
    }
  });
  if (errors.length > 0) return errors;

  let garden;
  try {
    garden = replay(world);
  } catch (error) {
    return [`replay failed – ${(error as Error).message}`];
  }
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(garden.nature, world.nature)) errors.push('nature does not match the replayed log');
  if (!same(garden.plants, world.plants)) errors.push('plants do not match the replayed log');
  if (!same(garden.structures, world.structures)) errors.push('structures do not match the replayed log');
  return errors;
}
