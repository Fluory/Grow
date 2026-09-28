import { describe, expect, it } from 'vitest';
import { applyDay, createGenesis, replay } from './apply';
import { applyWeather } from './effects';
import { checkBuild, checkPlant, checkWater, options } from './rules';
import type { Garden } from './garden';
import { FROST, RAIN, SUN, weather } from './testing';

/** A garden on `date` after the given weather, with plants/structures injected for the test. */
function gardenOn(date: string, w = weather('2026-04-01', SUN), extra: Partial<Garden> = {}): Garden {
  const g = applyWeather(replay(createGenesis('2026-03-01')), { ...w, date: date }, 30, date);
  return { ...g, ...extra };
}

const tree = (id: string, x: number, row: number, stage: number) => ({
  id,
  species: 'oak' as const,
  x,
  row,
  day: 1,
  stage,
  bloom: 0,
  fruit: 0,
  status: 'growing' as const,
});

describe('planting', () => {
  it('follows the sowing months', () => {
    expect(checkPlant(gardenOn('2026-04-10'), 'oak', 20, 1)).toBeNull();
    expect(checkPlant(gardenOn('2026-07-10'), 'oak', 20, 1)).toMatch(/planted in Mar–Apr, Oct–Nov/);
  });

  it('is impossible in frozen or snowy ground', () => {
    expect(checkPlant(gardenOn('2026-04-10', weather('2026-04-09', FROST)), 'oak', 20, 1)).toMatch(/frozen/);
  });

  it('keeps plants in their zones', () => {
    const g = gardenOn('2026-04-10');
    expect(checkPlant(g, 'oak', 44, 1)).toMatch(/needs the meadow or the stream bank/);
    expect(checkPlant(g, 'waterlily', 20, 1)).toMatch(/needs the stream/);
    expect(checkPlant(g, 'willow', 20, 1)).toMatch(/stream bank/);
    expect(checkPlant(g, 'willow', 36, 1)).toBeNull();
  });

  it('keeps trees apart and away from the edge', () => {
    const g = gardenOn('2026-04-10', undefined, { plants: [tree('p1', 20, 1, 5)] });
    expect(checkPlant(g, 'birch', 24, 1)).toMatch(/too close to the oak/);
    expect(checkPlant(g, 'birch', 27, 1)).toBeNull();
    expect(checkPlant(g, 'birch', 2, 1)).toMatch(/edge of the garden/);
  });

  it('needs sun, shade or wood where the species says so', () => {
    const g = gardenOn('2026-05-10', undefined, { plants: [tree('p1', 20, 0, 30)] });
    expect(checkPlant(g, 'lavender', 22, 2)).toMatch(/full sun/);
    expect(checkPlant(g, 'lavender', 28, 2)).toBeNull();
    expect(checkPlant(g, 'fern', 22, 2)).toBeNull();
    expect(checkPlant(g, 'fern', 28, 2)).toMatch(/need shade/);
  });

  it('never allows two things in one cell', () => {
    const g = gardenOn('2026-04-10', undefined, { plants: [tree('p1', 20, 1, 5)] });
    expect(checkPlant(g, 'poppy', 20, 1)).toMatch(/taken by the oak/);
  });
});

describe('building', () => {
  it('unlocks structures by what the garden has grown', () => {
    const young = gardenOn('2026-05-10', undefined, { plants: [tree('p1', 20, 1, 5)] });
    const grown = gardenOn('2026-05-10', undefined, { plants: [tree('p1', 20, 1, 30)] });
    expect(checkBuild(young, 'bench', 22, 2)).toMatch(/needs shade/);
    expect(checkBuild(grown, 'bench', 22, 2)).toBeNull();
    expect(checkBuild(young, 'birdhouse', 20, 1)).toMatch(/too small/);
    expect(checkBuild(grown, 'birdhouse', 20, 1)).toBeNull();
    expect(checkBuild(grown, 'bridge', 44, 0)).toMatch(/fallen tree/);
    expect(checkBuild(grown, 'snowman', 30, 1)).toMatch(/needs snow/);
    expect(checkBuild(grown, 'stepping', 40, 1)).toMatch(/column 44, row 1/);
  });
});

describe('watering', () => {
  it('only happens on dry days', () => {
    const plants = [tree('p1', 20, 1, 5)];
    expect(checkWater(gardenOn('2026-05-10', undefined, { plants }), 'p1')).toBeNull();
    expect(checkWater(gardenOn('2026-05-10', weather('2026-05-09', RAIN), { plants }), 'p1')).toMatch(/dry day/);
  });
});

describe('applyDay', () => {
  it('records weather, choice and the new id – and refuses a second entry for the same day', () => {
    const world = createGenesis('2026-04-01');
    const { world: next, entry } = applyDay(
      world,
      {
        weather: weather('2026-04-01', RAIN),
        choice: { action: 'plant', species: 'oak', x: 20, row: 1 },
        source: 'claude',
      },
      '2026-04-02',
    );
    expect(entry).toMatchObject({ day: 1, action: 'plant', target: 'p1', source: 'claude' });
    expect(next.plants).toHaveLength(1);
    expect(() =>
      applyDay(
        next,
        { weather: weather('2026-04-01', RAIN), choice: { action: 'rest' }, source: 'claude' },
        '2026-04-02',
      ),
    ).toThrow(/already recorded/);
  });

  it('rejects titles with links and illegal choices', () => {
    const world = createGenesis('2026-04-01');
    const w = weather('2026-04-01', SUN);
    expect(() =>
      applyDay(
        world,
        { weather: w, choice: { action: 'rest' }, title: 'see https://x.y', source: 'claude' },
        '2026-04-02',
      ),
    ).toThrow(/links/);
    expect(() =>
      applyDay(
        world,
        { weather: w, choice: { action: 'plant', species: 'oak', x: 44, row: 1 }, source: 'claude' },
        '2026-04-02',
      ),
    ).toThrow(/needs the meadow/);
  });

  it('lists options only for what is legal', () => {
    const g = gardenOn('2026-01-10', weather('2026-01-09', FROST));
    const o = options(g);
    expect(o.frozen).toMatch(/frozen/);
    expect(o.plant).toHaveLength(0);
  });
});
