import { describe, expect, it } from 'vitest';
import { createGenesis } from '@/features/garden';
import { grow, RAIN, SUN, weather } from '@/features/garden/testing';
import { commitMessage, commitTitle, plan, prBody, status } from './report';

describe('daily PR body', () => {
  it('fills every section the PR guard checks', () => {
    const body = prBody(createGenesis('2026-09-28'));
    for (const heading of [
      '## Was ist passiert (Klartext)',
      '## Doku-Entscheidung',
      '## Plan-Pflicht',
      '## Nachweis',
      '## Dateigrößen',
    ]) {
      expect(body).toContain(heading);
    }
    expect(body).toMatch(/^- `verify`: grün/m);
    expect(body.match(/^- \[x\] Keine langlebige Doku/gm)).toHaveLength(1);
  });
});

describe('commit', () => {
  const world = grow('2026-04-01', 3, (date, i) => weather(date, i % 2 ? RAIN : SUN));

  it('carries the weather in the title and nature in the body', () => {
    expect(commitTitle(world)).toMatch(/^Day 3: .+ \((rain|sun) [\d.]+ (mm|h)\)$/);
    expect(commitMessage(world)).toMatch(/(Rain|Sun), [\d.]+ (mm|h):/);
  });

  it('stops when today is already recorded and plans otherwise', () => {
    expect(status(world, '2026-04-04').done).toBe(true);
    const sheet = plan(world, '2026-04-05', weather('2026-04-04', RAIN));
    expect(sheet.done).toBe(false);
    expect(sheet.weather.condition).toBe('rain');
    expect(sheet.nature.effects[0]).toMatch(/^Rain/);
    expect(sheet.choices.rest).toBe('always allowed');
  });
});
