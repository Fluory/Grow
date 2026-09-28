import type { Rng, SpeciesId } from '@/features/garden';
import type { Grammar, LeafKind, Module } from './lsystem';

/**
 * One grammar per plant. Lengths are relative (the skeleton is scaled to the species'
 * height); widths and leaf sizes are garden units. Trees use their levels – every level
 * adds a ring of branches – herbs keep their shape and grow in size (`GROWTH_MODE`).
 */

const F = (len: number, w: number): Module => ({ s: 'F', len, w });
const roll = (a: number): Module => ({ s: '/', a });
const pitch = (a: number): Module => ({ s: '&', a });
const yaw = (a: number): Module => ({ s: '+', a });
const push: Module = { s: '[' };
const pop: Module = { s: ']' };
const leaf = (size: number, kind: LeafKind, until?: number, born?: number): Module => ({
  s: 'L',
  size,
  kind,
  until,
  born,
});
const j = (rng: Rng, amount: number) => (rng() * 2 - 1) * amount;
const A = (len: number, w: number): Module => ({ s: 'A', len, w });
const B = (len: number, w: number): Module => ({ s: 'B', len, w });
const C = (len: number, w: number): Module => ({ s: 'C', len, w });

/** The apex's own leaf tuft – visible until the apex is rewritten into branches. */
const tuft = (m: { born?: number }, k: number, size: number, kind: LeafKind): Module => leaf(size, kind, k, m.born);

/** A short side twig carrying one leaf cluster. */
const twig = (rng: Rng, len: number, w: number, size: number, kind: LeafKind): Module[] => [
  push,
  roll(rng() * 360),
  pitch(40 + j(rng, 15)),
  F(len, w),
  leaf(size, kind),
  pop,
];

export const GRAMMARS: Partial<Record<SpeciesId, Grammar>> = {
  oak: {
    levels: 5,
    tropism: 0.1,
    apex: { kind: 'blob', size: 0.9 },
    axiom: (rng) => [F(1.3, 0.5), roll(rng() * 360), F(0.7, 0.45), A(1.3, 0.4)],
    rules: {
      A: (m, rng, k) => {
        const out: Module[] = [tuft(m, k, 0.9, 'blob')];
        const n = rng() < 0.6 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          out.push(
            roll(137.5 + j(rng, 30)),
            push,
            pitch((k === 1 ? 36 : k === 2 ? 48 : 56) + j(rng, 14)),
            F(m.len * (0.9 + j(rng, 0.14)), m.w * 0.72),
            A(m.len * 0.8, m.w * 0.62),
            pop,
          );
        }
        if (k >= 2) out.push(leaf(0.8, 'blob'), ...twig(rng, m.len * 0.35, m.w * 0.4, 0.75, 'blob'));
        return out;
      },
    },
  },

  birch: {
    levels: 6,
    tropism: 0.3,
    apex: { kind: 'drop', size: 0.5 },
    axiom: () => [F(1.2, 0.3), A(0.95, 0.27)],
    rules: {
      A: (m, rng, k) => {
        const out: Module[] = [tuft(m, k, 0.56, 'drop'), F(m.len, m.w)];
        const n = rng() < 0.5 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          out.push(roll(137.5 + j(rng, 25)), push, pitch(32 + j(rng, 10)), B(m.len * 0.66, m.w * 0.42), pop);
        }
        out.push(roll(j(rng, 20)), A(m.len * 0.9, m.w * 0.84));
        return out;
      },
      B: (m, rng, k) => [
        tuft(m, k, 0.5, 'drop'),
        F(m.len, m.w),
        leaf(0.48, 'drop'),
        ...twig(rng, m.len * 0.5, m.w * 0.5, 0.48, 'drop'),
        ...twig(rng, m.len * 0.45, m.w * 0.5, 0.46, 'drop'),
        ...twig(rng, m.len * 0.35, m.w * 0.5, 0.42, 'drop'),
        B(m.len * 0.84, m.w * 0.75),
      ],
    },
  },

  pine: {
    levels: 7,
    tropism: 0.16,
    apex: { kind: 'needle', size: 0.75 },
    axiom: () => [F(0.9, 0.4), A(0.78, 0.37)],
    rules: {
      A: (m, rng, k) => {
        const out: Module[] = [tuft(m, k, 0.8, 'needle'), F(m.len, m.w)];
        const whorl = 4 + (rng() < 0.4 ? 1 : 0);
        const start = rng() * 360;
        for (let i = 0; i < whorl; i++) {
          out.push(
            push,
            roll(start + (i * 360) / whorl + j(rng, 14)),
            pitch(68 + j(rng, 9)),
            B(0.5 + j(rng, 0.07), m.w * 0.3),
            pop,
          );
        }
        out.push(roll(j(rng, 15)), A(m.len * 0.93, m.w * 0.9));
        return out;
      },
      B: (m, rng, k) => {
        const out: Module[] = [tuft(m, k, 0.72, 'needle'), F(m.len, m.w), leaf(0.72, 'needle')];
        if (rng() < 0.6) out.push(push, yaw(42), F(m.len * 0.45, m.w * 0.5), leaf(0.62, 'needle'), pop);
        if (rng() < 0.6) out.push(push, yaw(-42), F(m.len * 0.45, m.w * 0.5), leaf(0.62, 'needle'), pop);
        out.push(B(m.len * 0.84, m.w * 0.8));
        return out;
      },
    },
  },

  apple: {
    levels: 5,
    tropism: 0.16,
    apex: { kind: 'broad', size: 0.66 },
    axiom: (rng) => [F(1, 0.42), roll(rng() * 360), A(0.95, 0.36)],
    rules: {
      A: (m, rng, k) => {
        const out: Module[] = [tuft(m, k, 0.75, 'broad')];
        const n = rng() < 0.5 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          out.push(
            roll(125 + j(rng, 30)),
            push,
            pitch(46 + j(rng, 15)),
            F(m.len * (0.95 + j(rng, 0.15)), m.w * 0.7),
            A(m.len * 0.8, m.w * 0.62),
            pop,
          );
        }
        if (k >= 2) out.push(leaf(0.62, 'broad'), { s: 'K', size: 0.3, kind: 'blossom' });
        if (k >= 3) out.push(...twig(rng, m.len * 0.3, m.w * 0.4, 0.6, 'broad'));
        return out;
      },
    },
  },

  willow: {
    levels: 5,
    tropism: 0,
    apex: { kind: 'blade', size: 0.8 },
    axiom: () => [F(1.5, 0.5), A(1.05, 0.44)],
    rules: {
      A: (m, rng, k) => {
        const out: Module[] = [tuft(m, k, 0.75, 'drop')];
        const limbs = k === 1 ? 3 : k === 2 ? 2 : 0;
        for (let i = 0; i < limbs; i++) {
          out.push(
            roll(120 + j(rng, 20)),
            push,
            pitch(30 + j(rng, 10)),
            F(m.len * 1.05, m.w * 0.68),
            A(m.len * 0.85, m.w * 0.6),
            pop,
          );
        }
        const whips = k === 1 ? 0 : k === 2 ? 2 : 4 + (rng() < 0.5 ? 1 : 0);
        for (let i = 0; i < whips; i++) {
          out.push(roll(72 + j(rng, 30)), push, pitch(70 + j(rng, 25)), { s: 'T', e: 1.1 }, C(0.5, m.w * 0.4), pop);
        }
        return out;
      },
      C: (m, _rng, k) => [
        tuft(m, k, 0.75, 'blade'),
        F(m.len, m.w),
        leaf(0.8, 'blade'),
        leaf(0.7, 'blade'),
        F(m.len, m.w * 0.85),
        leaf(0.8, 'blade'),
        leaf(0.7, 'blade'),
        F(m.len, m.w * 0.7),
        leaf(0.75, 'blade'),
        C(m.len, m.w * 0.6),
      ],
    },
  },

  lavender: {
    levels: 3,
    apex: { kind: 'needle', size: 0.16 },
    axiom: (rng) => {
      const out: Module[] = [];
      for (let i = 0; i < 17; i++)
        out.push(push, roll(i * 137.5), pitch(6 + rng() * 30), A(0.24 + rng() * 0.06, 0.035), pop);
      return out;
    },
    rules: {
      A: (m, rng, k) => {
        const out: Module[] = [F(m.len, m.w), leaf(0.16, 'needle'), yaw(j(rng, 6))];
        if (k === 3) out.push(F(m.len * 0.8, m.w * 0.8), { s: 'K', size: 0.36, kind: 'spike' });
        else out.push(A(m.len * 0.95, m.w * 0.9));
        return out;
      },
    },
  },

  fern: {
    levels: 7,
    apex: { kind: 'drop', size: 0.1 },
    axiom: (rng) => {
      const out: Module[] = [];
      for (let i = 0; i < 7; i++) {
        out.push(push, roll(i * 137.5 + j(rng, 20)), pitch(30 + j(rng, 12)), { s: 'T', e: 0.22 }, A(0.2, 0.03), pop);
      }
      return out;
    },
    rules: {
      A: (m, _rng, k) => {
        const size = 0.34 * (1 - k / 9);
        return [
          tuft(m, k, 0.12, 'drop'),
          F(m.len, m.w),
          push,
          yaw(72),
          leaf(size, 'pinna'),
          pop,
          push,
          yaw(-72),
          leaf(size, 'pinna'),
          pop,
          A(m.len * 0.93, m.w * 0.85),
        ];
      },
    },
  },

  reed: {
    levels: 1,
    axiom: (rng) => {
      const out: Module[] = [];
      for (let i = 0; i < 11; i++)
        out.push(push, roll(rng() * 360), pitch(3 + rng() * 16), leaf(1.8 + rng() * 1.3, 'grass'), pop);
      for (let i = 0; i < 3; i++) {
        out.push(push, roll(i * 120 + rng() * 40), pitch(2 + rng() * 6), F(1.1, 0.03), F(1, 0.03), F(0.6, 0.025));
        out.push({ s: 'K', size: 0.34, kind: 'cattail' }, pop);
      }
      return out;
    },
    rules: {},
  },

  sunflower: {
    levels: 1,
    axiom: (rng) => {
      const out: Module[] = [];
      for (let i = 0; i < 6; i++) {
        out.push(F(0.55, 0.1 - i * 0.008), yaw(j(rng, 4)));
        if (i < 5) out.push(push, roll(90 + i * 180 + j(rng, 25)), pitch(58), leaf(0.72 - i * 0.07, 'heart'), pop);
      }
      out.push(pitch(-8), { s: 'K', size: 0.62, kind: 'head' });
      return out;
    },
    rules: {},
  },

  poppy: {
    levels: 1,
    axiom: (rng) => {
      const out: Module[] = [];
      for (let i = 0; i < 3; i++)
        out.push(push, roll(90 + i * 120 + rng() * 30), pitch(55 + rng() * 15), leaf(0.36, 'blade'), pop);
      out.push(yaw(j(rng, 8)));
      for (let i = 0; i < 5; i++) out.push(F(0.22, 0.028), yaw(j(rng, 9)));
      out.push({ s: 'K', size: 0.3, kind: 'cup' });
      return out;
    },
    rules: {},
  },

  tulip: {
    levels: 1,
    axiom: (rng) => [
      push,
      roll(90 + rng() * 40),
      pitch(22),
      leaf(0.62, 'broad'),
      pop,
      push,
      roll(250 + rng() * 40),
      pitch(26),
      leaf(0.55, 'broad'),
      pop,
      F(0.3, 0.05),
      F(0.3, 0.05),
      F(0.28, 0.045),
      { s: 'K', size: 0.3, kind: 'cup' },
    ],
    rules: {},
  },
};

/**
 * `levels`: the plant becomes more complex – every growth level adds branches.
 * `scale`: the plant keeps its shape and grows in size (herbs and flowers).
 */
export const GROWTH_MODE: Partial<Record<SpeciesId, 'levels' | 'scale'>> = {
  oak: 'levels',
  birch: 'levels',
  pine: 'levels',
  apple: 'levels',
  willow: 'levels',
  lavender: 'scale',
  fern: 'levels',
  reed: 'scale',
  sunflower: 'scale',
  poppy: 'scale',
  tulip: 'scale',
};
