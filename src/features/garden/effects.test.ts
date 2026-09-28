import { describe, expect, it } from 'vitest';
import { createGenesis, replay } from './apply';
import { applyWeather } from './effects';
import type { Garden } from './garden';
import type { Plant } from './schema';
import { FROST, RAIN, SUN, weather } from './testing';

const plant = (over: Partial<Plant>): Plant => ({
  id: 'p1',
  species: 'oak',
  x: 20,
  row: 1,
  day: 0,
  stage: 5,
  bloom: 0,
  fruit: 0,
  status: 'growing',
  ...over,
});

function garden(plants: Plant[], extra: Partial<Garden> = {}): Garden {
  return { ...replay(createGenesis('2026-03-01')), plants, nextPlant: plants.length + 1, ...extra };
}

describe('rain grows', () => {
  it('adds one stage, two on heavy rain, and raises the stream', () => {
    const g = garden([plant({})]);
    const light = applyWeather(g, weather('2026-05-01', RAIN), 60, '2026-05-02');
    expect(light.plants[0]?.stage).toBe(6);
    expect(light.nature.water).toBe(4);
    const heavy = applyWeather(g, weather('2026-05-01', { rain: 14 }), 60, '2026-05-02');
    expect(heavy.plants[0]?.stage).toBe(7);
    expect(heavy.effects[0]).toMatch(/grew two stages/);
  });

  it('does nothing outside the growing season', () => {
    const g = garden([plant({})]);
    const winter = applyWeather(g, weather('2026-12-01', RAIN), 60, '2026-12-02');
    expect(winter.plants[0]?.stage).toBe(5);
  });
});

describe('sun ripens', () => {
  it('opens blossoms and ripens fruit in season, and lowers the stream', () => {
    const g = garden([plant({ species: 'apple', stage: 40 })]);
    const april = applyWeather(g, weather('2026-04-20', SUN), 50, '2026-04-21');
    expect(april.plants[0]?.bloom).toBeGreaterThan(0);
    expect(april.nature.water).toBe(2);
    const august = applyWeather(g, weather('2026-08-20', SUN), 170, '2026-08-21');
    expect(august.plants[0]?.fruit).toBeGreaterThan(0);
  });
});

describe('frost stops', () => {
  it('freezes the stream and wilts annuals', () => {
    const g = garden([plant({ species: 'sunflower', stage: 10 })]);
    const frosty = applyWeather(g, weather('2026-10-20', FROST), 230, '2026-10-21');
    expect(frosty.nature.ice).toBe(true);
    expect(frosty.plants[0]?.status).toBe('wilted');
    const thawed = applyWeather(frosty, weather('2026-10-21', { tmax: 9 }), 231, '2026-10-22');
    expect(thawed.nature.ice).toBe(false);
  });

  it('clears wilted annuals in spring', () => {
    const g = garden([plant({ species: 'poppy', status: 'wilted' })]);
    expect(applyWeather(g, weather('2026-02-27', {}), 1, '2026-02-28').plants).toHaveLength(1);
    expect(applyWeather(g, weather('2026-02-28', {}), 2, '2026-03-01').plants).toHaveLength(0);
  });
});

describe('snow covers', () => {
  it('builds up and melts again, taking snowmen with it', () => {
    const g = garden([], {
      structures: [{ id: 's1', type: 'snowman', x: 20, row: 1, day: 1 }],
      nature: { water: 3, ice: false, snow: 1 },
    });
    const more = applyWeather(g, weather('2026-01-10', { snow: 4, tmin: -2, tmax: 0 }), 5, '2026-01-11');
    expect(more.nature.snow).toBe(3);
    const warm = applyWeather(more, weather('2026-01-11', { tmax: 10, rain: 3 }), 6, '2026-01-12');
    const warmer = applyWeather(warm, weather('2026-01-12', { tmax: 10, rain: 3 }), 7, '2026-01-13');
    expect(warmer.nature.snow).toBe(0);
    expect(warmer.structures).toHaveLength(0);
    expect(warmer.effects.join(' ')).toMatch(/snowman melted/);
  });
});

describe('storm fells', () => {
  it('fells the tallest grown tree, at most once in 60 days', () => {
    const g = garden([plant({ id: 'p1', stage: 60 }), plant({ id: 'p2', x: 30, stage: 90 })]);
    const first = applyWeather(g, weather('2026-06-01', { gust: 70 }), 90, '2026-06-02');
    expect(first.plants.find((p) => p.id === 'p2')?.status).toBe('fallen');
    const second = applyWeather(first, weather('2026-06-02', { gust: 70 }), 91, '2026-06-03');
    expect(second.plants.find((p) => p.id === 'p1')?.status).toBe('growing');
  });

  it('strands a paper boat when no tree can fall – rising water carries it away', () => {
    const g = garden([]);
    const stormy = applyWeather(g, weather('2026-06-01', { gust: 70 }), 90, '2026-06-02');
    expect(stormy.structures.map((s) => s.type)).toEqual(['boat']);
    let wet = stormy;
    for (let i = 0; i < 6; i++) wet = applyWeather(wet, weather('2026-06-02', { rain: 12 }), 91 + i, '2026-06-03');
    expect(wet.structures).toHaveLength(0);
  });
});
