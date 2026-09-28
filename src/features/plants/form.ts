import { SPECIES, type SpeciesId } from '@/features/garden';
import { GRAMMARS, GROWTH_MODE } from './grammars';
import { buildSkeleton, type BloomKind, type LeafKind, type Skeleton, type Vec3 } from './lsystem';

/**
 * The visible shape of a plant at a growth of 0–1, in garden units with the base at the
 * origin. Shared by the SVG renderer and the 3D scene, so both always agree.
 */

export interface FormSegment {
  a: Vec3;
  b: Vec3;
  w: number;
  order: number;
}

export interface FormLeaf {
  p: Vec3;
  d: Vec3;
  size: number;
  kind: LeafKind;
}

export interface FormBloom {
  p: Vec3;
  d: Vec3;
  size: number;
  kind: BloomKind;
  rank: number;
}

export interface Form {
  segments: FormSegment[];
  leaves: FormLeaf[];
  blooms: FormBloom[];
}

const cache = new Map<string, Skeleton>();

/** The fully grown skeleton of one plant; cached – a plant's seed never changes. */
export function skeletonOf(species: SpeciesId, seed: number): Skeleton | null {
  const grammar = GRAMMARS[species];
  if (!grammar) return null;
  const key = `${species}:${seed}`;
  let skeleton = cache.get(key);
  if (!skeleton) {
    skeleton = buildSkeleton(grammar, seed);
    if (cache.size > 600) cache.clear();
    cache.set(key, skeleton);
  }
  return skeleton;
}

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

export function plantForm(species: SpeciesId, seed: number, growth: number): Form {
  const skeleton = skeletonOf(species, seed);
  if (!skeleton) return { segments: [], leaves: [], blooms: [] };
  const g = Math.max(0, Math.min(1, growth));
  const norm = SPECIES[species].height / Math.max(0.01, skeleton.height);

  if (GROWTH_MODE[species] !== 'levels') {
    const s = (0.18 + 0.82 * g) * norm;
    return {
      segments: skeleton.segments.map((x) => ({ a: mul(x.a, s), b: mul(x.b, s), w: x.w * s, order: x.order })),
      leaves: skeleton.leaves.map((l) => ({ p: mul(l.p, s), d: l.d, size: l.size * s, kind: l.kind })),
      blooms: skeleton.blooms.map((b) => ({ p: mul(b.p, s), d: b.d, size: b.size * s, kind: b.kind, rank: b.rank })),
    };
  }

  const level = skeleton.levels * Math.pow(g, 0.85);
  const n = Math.floor(level);
  const frac = level - n;
  // positions shrink for young plants; widths and leaf sizes are absolute garden units
  const s = (0.3 + 0.7 * g) * norm;
  const thick = 0.25 + 0.75 * g;
  const leafScale = 0.6 + 0.4 * g;
  /** Position of an item born at `born`: full, growing in from its anchor, or hidden (null). */
  const place = (p: Vec3, anchor: Vec3, born: number): Vec3 | null => {
    if (born <= n) return mul(p, s);
    if (born === n + 1 && frac > 0) return mul(lerp(anchor, p, frac), s);
    return null;
  };

  const segments: FormSegment[] = [];
  for (const x of skeleton.segments) {
    const a = place(x.a, x.anchor, x.born);
    const b = place(x.b, x.anchor, x.born);
    if (a && b) segments.push({ a, b, w: x.w * thick, order: x.order });
  }
  const leaves: FormLeaf[] = [];
  for (const l of skeleton.leaves) {
    if (l.until <= n) continue;
    const p = place(l.p, l.anchor, l.born);
    if (!p) continue;
    let size = l.size * leafScale;
    if (l.born === n + 1) size *= frac;
    if (l.until === n + 1) size *= 1 - frac;
    if (size > 0.02) leaves.push({ p, d: l.d, size, kind: l.kind });
  }
  const blooms: FormBloom[] = [];
  for (const b of skeleton.blooms) {
    if (b.born > n) continue;
    blooms.push({ p: mul(b.p, s), d: b.d, size: b.size * leafScale, kind: b.kind, rank: b.rank });
  }
  return { segments, leaves, blooms };
}
