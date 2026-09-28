import { distance, type Cell, type Garden } from './garden';
import { createRng, hashString, pick, type Rng } from './rng';
import { options, type Choice, type Options } from './rules';
import type { Plant, SpeciesId } from './schema';
import { SPECIES, type Kind } from './species';
import { STRUCTURES } from './structures';

/**
 * The director is the routine's fallback and the engine behind the simulation: a weighted
 * random pick among the legal choices, nudged towards a balanced garden. Deterministic –
 * the same garden on the same date always gets the same suggestion.
 */

export interface Suggestion {
  choice: Choice;
  reason: string;
}

/** How many plants of each kind a balanced garden wants. */
export const TARGETS: Record<Kind, number> = { tree: 9, shrub: 8, flower: 22, water: 7, fungus: 4 };

function kindCounts(g: Garden): Record<Kind, number> {
  const counts: Record<Kind, number> = { tree: 0, shrub: 0, flower: 0, water: 0, fungus: 0 };
  for (const p of g.plants) if (p.status !== 'fallen') counts[SPECIES[p.species].kind]++;
  return counts;
}

function pickCell(g: Garden, species: SpeciesId, cells: Cell[], rng: Rng): Cell {
  const info = SPECIES[species];
  const others = (filter: (p: Plant) => boolean) => g.plants.filter((p) => p.status !== 'fallen' && filter(p));
  let score: (c: Cell) => number;
  if (info.kind === 'tree') {
    const trees = others((p) => SPECIES[p.species].kind === 'tree');
    score = (c) => Math.min(12, ...trees.map((t) => distance(t, c))) + rng() * 4;
  } else if (info.kind === 'flower') {
    const same = others((p) => p.species === species);
    score = (c) => (same.length > 0 ? -Math.min(...same.map((p) => distance(p, c))) : 0) + rng() * 3;
  } else {
    score = () => rng();
  }
  let best = cells[0] as Cell;
  let bestScore = -Infinity;
  for (const c of cells) {
    const s = score(c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

export function recommend(g: Garden, opts: Options = options(g)): Suggestion {
  const rng = createRng(hashString(`director:${g.date}:${g.day}`));
  const counts = kindCounts(g);
  const living = g.plants.filter((p) => p.status !== 'fallen');
  const pool: { weight: number; make: () => Suggestion }[] = [];

  for (const o of opts.plant) {
    const info = SPECIES[o.species];
    const have = counts[info.kind];
    const target = TARGETS[info.kind];
    let weight = have < target ? 2.2 * (1 - have / target) + 0.3 : 0.12;
    if (info.kind === 'tree') weight *= 1.4;
    weight /= 1 + living.filter((p) => p.species === o.species).length * 0.6;
    pool.push({
      weight,
      make: () => {
        const cell = pickCell(g, o.species, o.cells, rng);
        return {
          choice: { action: 'plant', species: o.species, x: cell.x, row: cell.row },
          reason: `${have} of ${target} ${info.kind === 'water' ? 'water plants' : `${info.kind}s`} so far`,
        };
      },
    });
  }

  for (const o of opts.build) {
    const weight = o.structure === 'snowman' ? 3 : o.structure === 'stone' ? 0.3 : 1.6;
    pool.push({
      weight,
      make: () => {
        const cell = pick(rng, o.cells);
        return {
          choice: { action: 'build', structure: o.structure, x: cell.x, row: cell.row },
          reason: `the ${STRUCTURES[o.structure].label} is unlocked`,
        };
      },
    });
  }

  const ripest = [...opts.harvest].sort((a, b) => b.fruit - a.fruit)[0];
  if (ripest) {
    pool.push({
      weight: 6,
      make: () => ({ choice: { action: 'harvest', target: ripest.id }, reason: 'fruit is ripe' }),
    });
  }

  const thirsty = opts.water
    .filter((p) => p.stage / SPECIES[p.species].maxStage < 0.6)
    .sort((a, b) => a.stage / SPECIES[a.species].maxStage - b.stage / SPECIES[b.species].maxStage)[0];
  if (thirsty) {
    pool.push({
      weight: 0.8,
      make: () => ({ choice: { action: 'water', target: thirsty.id }, reason: 'a dry day and a young plant' }),
    });
  }

  pool.push({
    weight: 0.35,
    make: () => ({ choice: { action: 'rest' }, reason: 'sometimes the garden needs nothing' }),
  });

  const total = pool.reduce((sum, o) => sum + o.weight, 0);
  let r = rng() * total;
  for (const o of pool) {
    r -= o.weight;
    if (r <= 0) return o.make();
  }
  return (pool[pool.length - 1] as (typeof pool)[number]).make();
}
