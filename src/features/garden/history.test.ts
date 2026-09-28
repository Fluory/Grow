import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replay, timeline } from './apply';
import { validateWorld } from './history';
import { gardenStats } from './stats';
import { grow } from './testing';
import { makeWeather } from './weather';

type Row = [string, number, number, number, number, number, number, number, number];
const year = JSON.parse(readFileSync('src/features/world-data/weather-year.json', 'utf8')) as { days: Row[] };
const real = year.days.map(([date, code, tmax, tmin, rain, snow, sun, wind, gust]) =>
  makeWeather({ date, code, tmax, tmin, rain, snow, sun, wind, gust }),
);

describe('a year of real Heilbronn weather', () => {
  const world = grow('2025-09-28', real.length, (_date, i) => real[i - 1] as (typeof real)[number]);

  it('produces a valid, replayable world', () => {
    expect(validateWorld(JSON.parse(JSON.stringify(world)))).toEqual([]);
  });

  it('is deterministic', () => {
    const again = grow('2025-09-28', 60, (_date, i) => real[i - 1] as (typeof real)[number]);
    expect(JSON.stringify(again.days)).toBe(JSON.stringify(world.days.slice(0, 61)));
  });

  it('grows a real garden', () => {
    const stats = gardenStats(world);
    expect(stats.living).toBeGreaterThan(30);
    expect(stats.byKind.tree).toBeGreaterThan(4);
    expect(stats.tallest).toBeGreaterThan(6);
    expect(stats.rainDays + stats.sunDays + stats.frostDays).toBeGreaterThan(250);
  });

  it('gives the same garden through timeline() and replay()', () => {
    const all = timeline(world);
    expect(JSON.stringify(all[120]?.plants)).toBe(JSON.stringify(replay(world, 120).plants));
  });

  it('detects a tampered snapshot or log', () => {
    const copy = JSON.parse(JSON.stringify(world));
    copy.plants[0].stage += 1;
    expect(validateWorld(copy)).toContain('plants do not match the replayed log');
    const broken = JSON.parse(JSON.stringify(world));
    const planted = broken.days.find((d: { action: string }) => d.action === 'plant');
    planted.x = 0;
    expect(validateWorld(broken)[0]).toMatch(/replay failed/);
  });
});
