import { createRng, type Rng } from '@/features/garden';

/**
 * A small parametric, stochastic L-system with a 3D turtle.
 *
 * Every module remembers the iteration it was born in. Because only apices are rewritten
 * (segments never change once drawn), iteration n+1 contains iteration n – so a plant can
 * be shown at any growth *level* between 0 and N: segments born up to that level are
 * visible, the newest ones grow in. That is how a plant "becomes more complex with every
 * rain day".
 */

export type Vec3 = [number, number, number];

export type LeafKind = 'blob' | 'needle' | 'blade' | 'grass' | 'drop' | 'pinna' | 'heart' | 'broad';
export type BloomKind = 'blossom' | 'fruit' | 'spike' | 'head' | 'cup' | 'cattail';

export type Module =
  | { s: 'F'; len: number; w: number; born?: number }
  | { s: '+' | '&' | '/'; a: number; born?: number }
  | { s: '[' | ']' | '@'; born?: number }
  | { s: 'T'; e: number; born?: number }
  | { s: 'L'; size: number; kind: LeafKind; until?: number; born?: number }
  | { s: 'K'; size: number; kind: BloomKind; born?: number }
  | { s: 'A' | 'B' | 'C'; len: number; w: number; n?: number; born?: number };

export interface Grammar {
  /** Iterations for the fully grown plant. */
  levels: number;
  axiom: (rng: Rng) => Module[];
  /** Rewrites apices; `k` is the iteration being produced (1 … levels). */
  rules: Partial<
    Record<'A' | 'B' | 'C', (m: Extract<Module, { s: 'A' | 'B' | 'C' }>, rng: Rng, k: number) => Module[]>
  >;
  /** Gravity (+) or light (−) bending of thin branches, 0 = none. */
  tropism?: number;
  /** Leaf tuft drawn at apices that were never rewritten (the outermost tips). */
  apex?: { kind: LeafKind; size: number };
}

export interface Segment {
  a: Vec3;
  b: Vec3;
  w: number;
  order: number;
  born: number;
  /** Where the apex stood that grew this segment – it grows in from here. */
  anchor: Vec3;
}

export interface Leaf {
  p: Vec3;
  anchor: Vec3;
  /** Unit direction the leaf points to. */
  d: Vec3;
  size: number;
  kind: LeafKind;
  born: number;
  until: number;
}

export interface Bloom {
  p: Vec3;
  anchor: Vec3;
  d: Vec3;
  size: number;
  kind: BloomKind;
  born: number;
  /** Stable order in which blossom slots fill up. */
  rank: number;
}

export interface Skeleton {
  levels: number;
  segments: Segment[];
  leaves: Leaf[];
  blooms: Bloom[];
  /** Height of the fully grown skeleton (for normalising to the species' height). */
  height: number;
}

/** Derive the module string. Each rewritten apex leaves a leaf marker that lives until the rewrite. */
export function derive(grammar: Grammar, seed: number): Module[] {
  const rng = createRng(seed);
  let modules: Module[] = grammar.axiom(rng).map((m) => ({ ...m, born: 0 }));
  for (let k = 1; k <= grammar.levels; k++) {
    const next: Module[] = [];
    for (const m of modules) {
      const rule = m.s === 'A' || m.s === 'B' || m.s === 'C' ? grammar.rules[m.s] : undefined;
      if (!rule || (m.s !== 'A' && m.s !== 'B' && m.s !== 'C')) {
        next.push(m);
        continue;
      }
      next.push({ s: '@', born: k });
      for (const out of rule(m, rng, k)) next.push({ ...out, born: out.born ?? k });
    }
    modules = next;
  }
  return modules;
}

// ---- tiny vector helpers -------------------------------------------------------------

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Rotate v around a unit axis by `deg` degrees (Rodrigues). */
function rotate(v: Vec3, axis: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const d = v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
  const x = cross(axis, v);
  return [
    v[0] * c + x[0] * s + axis[0] * d * (1 - c),
    v[1] * c + x[1] * s + axis[1] * d * (1 - c),
    v[2] * c + x[2] * s + axis[2] * d * (1 - c),
  ];
}

interface Turtle {
  p: Vec3;
  anchor: Vec3;
  h: Vec3;
  l: Vec3;
  u: Vec3;
  order: number;
  tropism: number;
}

/** Interpret the module string with a 3D turtle that starts at the origin pointing up. */
export function interpret(modules: Module[], grammar: Grammar): Skeleton {
  let t: Turtle = {
    p: [0, 0, 0],
    anchor: [0, 0, 0],
    h: [0, 1, 0],
    l: [-1, 0, 0],
    u: [0, 0, 1],
    order: 0,
    tropism: grammar.tropism ?? 0,
  };
  const stack: Turtle[] = [];
  const segments: Segment[] = [];
  const leaves: Leaf[] = [];
  const blooms: Bloom[] = [];
  let height = 0;

  for (const m of modules) {
    const born = m.born ?? 0;
    switch (m.s) {
      case 'F': {
        // tropism: bend the heading towards gravity, more for thin (high-order) branches
        if (t.tropism !== 0 && t.order > 0) {
          const g: Vec3 = [0, t.tropism > 0 ? -1 : 1, 0];
          const axis = cross(t.h, g);
          const amount = Math.abs(t.tropism) * length(axis) * 57.3 * Math.min(1, t.order / 3);
          if (length(axis) > 1e-6) {
            const ax = normalize(axis);
            t = {
              ...t,
              h: normalize(rotate(t.h, ax, amount)),
              l: normalize(rotate(t.l, ax, amount)),
              u: normalize(rotate(t.u, ax, amount)),
            };
          }
        }
        const b = add(t.p, scale(t.h, m.len));
        segments.push({ a: t.p, b, w: m.w, order: t.order, born, anchor: t.anchor });
        height = Math.max(height, b[1]);
        t = { ...t, p: b };
        break;
      }
      case '+':
        t = { ...t, h: rotate(t.h, t.u, m.a), l: rotate(t.l, t.u, m.a) };
        break;
      case '&':
        t = { ...t, h: rotate(t.h, t.l, m.a), u: rotate(t.u, t.l, m.a) };
        break;
      case '/':
        t = { ...t, l: rotate(t.l, t.h, m.a), u: rotate(t.u, t.h, m.a) };
        break;
      case '@':
        t = { ...t, anchor: t.p };
        break;
      case '[':
        stack.push(t);
        t = { ...t, order: t.order + 1 };
        break;
      case ']':
        t = stack.pop() ?? t;
        break;
      case 'T':
        t = { ...t, tropism: m.e };
        break;
      case 'L':
        leaves.push({ p: t.p, anchor: t.anchor, d: t.h, size: m.size, kind: m.kind, born, until: m.until ?? Infinity });
        height = Math.max(height, t.p[1] + t.h[1] * m.size);
        break;
      case 'K':
        blooms.push({ p: t.p, anchor: t.anchor, d: t.h, size: m.size, kind: m.kind, born, rank: 0 });
        break;
      default:
        // unrewritten apices at the last level become leaves
        leaves.push({
          p: t.p,
          anchor: t.anchor,
          d: t.h,
          size: grammar.apex?.size ?? 0.8,
          kind: grammar.apex?.kind ?? 'blob',
          born,
          until: Infinity,
        });
    }
  }
  // blossom slots fill in a scattered but stable order
  const rng = createRng(blooms.length * 7919 + segments.length);
  const order = blooms.map((_, i) => ({ i, r: rng() })).sort((a, b) => a.r - b.r);
  order.forEach(({ i }, rank) => {
    const bloom = blooms[i];
    if (bloom) bloom.rank = rank;
  });
  return { levels: 0, segments, leaves, blooms, height };
}

export function buildSkeleton(grammar: Grammar, seed: number): Skeleton {
  return { ...interpret(derive(grammar, seed), grammar), levels: grammar.levels };
}
