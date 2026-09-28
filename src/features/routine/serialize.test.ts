import { expect, it } from 'vitest';
import { parseWorld, validateWorld } from '@/features/garden';
import { grow, RAIN, SUN, weather } from '@/features/garden/testing';
import { serializeWorld } from './serialize';

it('writes one entry per line and round-trips through the schema', () => {
  const world = grow('2026-04-01', 20, (date, i) => weather(date, i % 2 ? RAIN : SUN));
  const text = serializeWorld(world);
  const back = parseWorld(JSON.parse(text));
  expect(back).toEqual(world);
  expect(validateWorld(back)).toEqual([]);
  const dayLines = text.split('\n').filter((l) => l.trimStart().startsWith('{"day":'));
  expect(dayLines).toHaveLength(world.days.length);
});
