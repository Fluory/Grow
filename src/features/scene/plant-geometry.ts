import * as THREE from 'three';
import { SPECIES, type Plant } from '@/features/garden';
import { GROWTH_MODE, seedOf, skeletonOf, type BloomKind, type LeafKind, type Skeleton } from '@/features/plants';

/**
 * Three.js geometry for one plant, built once from its fully grown L-system skeleton.
 * Growth is shown without rebuilding: branch segments are sorted by the level they were
 * born in, so a growth level is just a draw range; leaves are instances that are scaled to
 * zero until their level arrives. The same skeleton draws the SVG, so both views agree.
 */

const SIDES = 5;

export interface PlantGeometry {
  species: Plant['species'];
  mode: 'levels' | 'scale';
  skeleton: Skeleton;
  /** Branches, sorted by birth level. */
  branches: THREE.BufferGeometry;
  /** Index count after all segments born up to level n: `levelEnds[n]`. */
  levelEnds: number[];
  /** Normalises the skeleton to the species' height. */
  norm: number;
}

const cache = new Map<string, PlantGeometry>();

function tube(
  positions: number[],
  normals: number[],
  indices: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  r0: number,
  r1: number,
): void {
  const axis = new THREE.Vector3().subVectors(b, a);
  const length = axis.length();
  if (length < 1e-5) return;
  axis.divideScalar(length);
  const helper = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(axis, helper).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();
  const base = positions.length / 3;
  for (let ring = 0; ring < 2; ring++) {
    const center = ring === 0 ? a : b;
    const r = ring === 0 ? r0 : r1;
    for (let i = 0; i < SIDES; i++) {
      const angle = (i / SIDES) * Math.PI * 2;
      const n = new THREE.Vector3().addScaledVector(u, Math.cos(angle)).addScaledVector(v, Math.sin(angle));
      positions.push(center.x + n.x * r, center.y + n.y * r, center.z + n.z * r);
      normals.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES;
    indices.push(base + i, base + SIDES + i, base + j, base + j, base + SIDES + i, base + SIDES + j);
  }
}

export function plantGeometry(plant: Pick<Plant, 'id' | 'species'>): PlantGeometry | null {
  const key = `${plant.species}:${seedOf(plant)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const skeleton = skeletonOf(plant.species, seedOf(plant));
  if (!skeleton) return null;
  const mode = GROWTH_MODE[plant.species] === 'levels' ? 'levels' : 'scale';
  const norm = SPECIES[plant.species].height / Math.max(0.01, skeleton.height);
  // In "levels" mode widths are absolute; the group is scaled by ~norm, so divide it out.
  const widthScale = mode === 'levels' ? 1 / norm : 1;

  const order = skeleton.segments.map((s, i) => ({ s, i })).sort((x, y) => x.s.born - y.s.born || x.i - y.i);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const levelEnds: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let level = 0;
  for (const { s } of order) {
    while (s.born > level) {
      levelEnds[level] = indices.length;
      level++;
    }
    a.set(s.a[0], s.a[1], s.a[2]);
    b.set(s.b[0], s.b[1], s.b[2]);
    const r = Math.max(0.012, (s.w * widthScale) / 2);
    tube(positions, normals, indices, a, b, r, r * 0.82);
  }
  for (; level <= skeleton.levels + 1; level++) levelEnds[level] = indices.length;

  const branches = new THREE.BufferGeometry();
  branches.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  branches.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  branches.setIndex(indices);
  branches.computeBoundingSphere();

  const result: PlantGeometry = { species: plant.species, mode, skeleton, branches, levelEnds, norm };
  if (cache.size > 400) cache.clear();
  cache.set(key, result);
  return result;
}

/** Growth 0–1 → level (for "levels" plants) and the group scale. Mirrors `plantForm`. */
export function growthView(geometry: PlantGeometry, growth: number): { level: number; scale: number } {
  const g = Math.max(0, Math.min(1, growth));
  if (geometry.mode === 'levels') {
    return { level: geometry.skeleton.levels * Math.pow(g, 0.85), scale: (0.3 + 0.7 * g) * geometry.norm };
  }
  return { level: Infinity, scale: (0.18 + 0.82 * g) * geometry.norm };
}

/** Unit leaf shapes: local +Y points along the leaf. */
export const LEAF_SHAPES: Record<LeafKind, THREE.BufferGeometry> = {
  blob: new THREE.IcosahedronGeometry(0.5, 0),
  drop: new THREE.OctahedronGeometry(0.5, 0).scale(0.55, 1, 0.3),
  needle: new THREE.OctahedronGeometry(0.5, 0).scale(0.7, 1, 0.45),
  blade: new THREE.OctahedronGeometry(0.5, 0).scale(0.18, 1, 0.06),
  grass: new THREE.OctahedronGeometry(0.5, 0).scale(0.08, 1, 0.04),
  pinna: new THREE.OctahedronGeometry(0.5, 0).scale(0.3, 1, 0.08),
  heart: new THREE.OctahedronGeometry(0.5, 0).scale(0.7, 1, 0.18),
  broad: new THREE.OctahedronGeometry(0.5, 0).scale(0.6, 1, 0.2),
};

export const BLOOM_SHAPE = new THREE.IcosahedronGeometry(0.5, 0);
export const BLOOM_KINDS: readonly BloomKind[] = ['blossom', 'fruit', 'spike', 'head', 'cup', 'cattail'];
