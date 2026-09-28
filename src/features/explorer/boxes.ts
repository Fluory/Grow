import { growth, SPECIES, STRUCTURES, type Garden, type Plant, type Structure } from '@/features/garden';
import { cellView } from '@/features/render';

/** Screen boxes of everything in the garden picture, for hover and click. */

export interface ElementBox {
  id: string;
  kind: 'plant' | 'structure';
  label: string;
  day: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const WIDTHS: Partial<Record<Structure['type'], number>> = {
  shed: 2.8,
  bench: 1.6,
  bridge: 5.4,
  stepping: 5,
  scarecrow: 1.6,
};
const HEIGHTS: Partial<Record<Structure['type'], number>> = { shed: 2.8, scarecrow: 2.6, lantern: 2, snowman: 2.2 };

function plantBox(p: Plant): ElementBox {
  const view = cellView(p.x, p.row);
  const info = SPECIES[p.species];
  const tall = p.status === 'fallen' ? 0.7 : Math.max(0.8, info.height * growth(p));
  const h = tall * view.unit;
  const half =
    p.status === 'fallen' ? 3 * view.unit : info.kind === 'tree' ? h * 0.42 + 4 : Math.max(0.55 * view.unit, h * 0.35);
  return {
    id: p.id,
    kind: 'plant',
    label: p.status === 'fallen' ? `fallen ${info.label}` : info.label,
    day: p.day,
    x0: view.x - half,
    x1: view.x + half,
    y0: view.y - h - 4,
    y1: view.y + 6,
  };
}

function structureBox(s: Structure, garden: Garden): ElementBox {
  const view = cellView(s.x, s.row);
  const w = (WIDTHS[s.type] ?? 1.1) * view.unit;
  let h = (HEIGHTS[s.type] ?? 1.4) * view.unit;
  let base = view.y;
  if (s.type === 'birdhouse') {
    const tree = garden.plants.find((p) => p.id === s.on);
    const height = tree ? SPECIES[tree.species].height * growth(tree) : 4;
    base = view.y - height * view.unit * 0.42 + view.unit * 0.6;
    h = view.unit * 1.2;
  }
  return {
    id: s.id,
    kind: 'structure',
    label: STRUCTURES[s.type].label,
    day: s.day,
    x0: view.x - w / 2,
    x1: view.x + w / 2,
    y0: base - h,
    y1: base + 4,
  };
}

export function boxesOf(garden: Garden): ElementBox[] {
  return [...garden.plants.map(plantBox), ...garden.structures.map((s) => structureBox(s, garden))];
}

/** The most specific box under a point (smallest area wins). */
export function hit(boxes: readonly ElementBox[], x: number, y: number): ElementBox | null {
  let best: ElementBox | null = null;
  let area = Infinity;
  for (const b of boxes) {
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
    const a = (b.x1 - b.x0) * (b.y1 - b.y0);
    if (a < area) {
      best = b;
      area = a;
    }
  }
  return best;
}
