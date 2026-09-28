import { describe, expect, it } from 'vitest';
import { createGenesis, timeline } from '@/features/garden';
import { grow, RAIN, SUN, weather } from '@/features/garden/testing';
import { gardenPicture, renderGardenSvg } from './garden-svg';

describe('renderGardenSvg', () => {
  const world = grow('2026-03-01', 60, (date, i) => weather(date, i % 3 === 0 ? RAIN : SUN));
  const gardens = timeline(world);

  it('is deterministic and names the day', () => {
    const a = renderGardenSvg(gardenPicture(world, gardens));
    const b = renderGardenSvg(gardenPicture(world, gardens));
    expect(a).toBe(b);
    expect(a).toContain(`Day ${world.days[world.days.length - 1]?.day}`);
    expect(a.startsWith('<svg')).toBe(true);
  });

  it('animates only when asked to', () => {
    expect(renderGardenSvg(gardenPicture(world, gardens), { animated: true })).toContain('@keyframes');
    expect(renderGardenSvg(gardenPicture(world, gardens), { animated: false })).not.toContain('@keyframes');
  });

  it('stays small enough for a README image', () => {
    expect(renderGardenSvg(gardenPicture(world, gardens)).length).toBeLessThan(600_000);
  });

  it('draws the empty genesis garden', () => {
    const genesis = createGenesis('2026-09-28');
    expect(renderGardenSvg(gardenPicture(genesis))).toContain('An empty garden bed by a stream');
  });
});
