import { replay } from './apply';
import { seasonOf, type Season } from './calendar';
import { growth, type Garden, type Stats } from './garden';
import type { DayEntry, World } from './schema';
import { SPECIES, type Kind } from './species';

export interface GardenStats extends Stats {
  day: number;
  date: string;
  season: Season;
  latest: DayEntry;
  living: number;
  byKind: Record<Kind, number>;
  structures: number;
  /** Tallest living plant in garden units. */
  tallest: number;
}

export function gardenStats(world: World, garden: Garden = replay(world)): GardenStats {
  const latest = world.days[world.days.length - 1] as DayEntry;
  const byKind: Record<Kind, number> = { tree: 0, shrub: 0, flower: 0, water: 0, fungus: 0 };
  let tallest = 0;
  const living = garden.plants.filter((p) => p.status === 'growing');
  for (const p of living) {
    const info = SPECIES[p.species];
    byKind[info.kind]++;
    tallest = Math.max(tallest, info.height * growth(p));
  }
  return {
    ...garden.stats,
    day: latest.day,
    date: latest.date,
    season: seasonOf(latest.date),
    latest,
    living: living.length,
    byKind,
    structures: garden.structures.length,
    tallest: Math.round(tallest * 10) / 10,
  };
}
