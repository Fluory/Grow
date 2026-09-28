'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hashString, SPECIES, type Plant } from '@/features/garden';
import { lookOf, type Look, type LeafKind } from '@/features/plants';
import { clock } from './clock';
import { BLOOM_SHAPE, growthView, LEAF_SHAPES, plantGeometry, type PlantGeometry } from './plant-geometry';

/**
 * One L-system plant in 3D. It is rebuilt only when the plant itself changes; growth between
 * two days is animated every frame by moving the branch draw range and scaling leaf instances.
 */

const materials = new Map<string, THREE.MeshStandardMaterial>();
export function material(
  color: string,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  const key = `${color}:${JSON.stringify(extra)}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
    materials.set(key, m);
  }
  return m;
}

const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true });
const bloomMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true });

const Y = new THREE.Vector3(0, 1, 0);
const tmp = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(),
  d: new THREE.Vector3(),
  c: new THREE.Color(),
};
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

interface Props {
  plant: Plant;
  /** Stage the plant reaches on the next recorded day (for smooth growth). */
  nextStage: number;
  /** Scene day at which `plant` was recorded, and the next one. */
  fromDay: number;
  toDay: number;
  date: string;
}

function leafIndexByKind(geometry: PlantGeometry): Map<LeafKind, number[]> {
  const map = new Map<LeafKind, number[]>();
  geometry.skeleton.leaves.forEach((leaf, i) => {
    const list = map.get(leaf.kind) ?? [];
    list.push(i);
    map.set(leaf.kind, list);
  });
  return map;
}

function bloomColor(kind: string, look: Look, fruit: boolean): string {
  if (fruit) return look.fruit;
  if (kind === 'cattail') return '#6b4a2e';
  return look.bloom;
}

export function PlantMesh({ plant, nextStage, fromDay, toDay, date }: Props) {
  const geometry = useMemo(() => plantGeometry(plant), [plant.id, plant.species]); // eslint-disable-line react-hooks/exhaustive-deps
  const look = useMemo(() => lookOf(plant, date), [plant, date]);
  const kinds = useMemo(() => (geometry ? leafIndexByKind(geometry) : new Map<LeafKind, number[]>()), [geometry]);
  const group = useRef<THREE.Group>(null);
  const branches = useRef<THREE.Mesh>(null);
  const leafRefs = useRef(new Map<LeafKind, THREE.InstancedMesh>());
  const blooms = useRef<THREE.InstancedMesh>(null);
  const last = useRef({ level: -1, scale: -1, look: null as Look | null });

  // colours follow the season and the plant's state
  useEffect(() => {
    if (!geometry) return;
    for (const [kind, indices] of kinds) {
      const mesh = leafRefs.current.get(kind);
      if (!mesh) continue;
      const shades = look.leaves ?? ['#6b5a3a'];
      indices.forEach((leafIndex, i) => {
        tmp.c.set(shades[hashString(`l${leafIndex}`) % shades.length] ?? '#557744');
        mesh.setColorAt(i, tmp.c);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    last.current.look = null;
  }, [geometry, kinds, look]);

  useFrame(() => {
    if (!geometry || !group.current) return;
    const info = SPECIES[plant.species];
    const t = toDay > fromDay ? Math.min(1, Math.max(0, (clock.day - fromDay) / (toDay - fromDay))) : 0;
    const stage = plant.stage + (nextStage - plant.stage) * t;
    const { level, scale } = growthView(geometry, stage / info.maxStage);
    const state = last.current;
    if (Math.abs(level - state.level) < 0.01 && Math.abs(scale - state.scale) < 0.001 && state.look === look) return;
    state.level = level;
    state.scale = scale;
    state.look = look;
    group.current.scale.setScalar(scale);

    const n = Math.floor(level);
    const frac = level - n;
    if (branches.current) {
      const ends = geometry.levelEnds;
      const count =
        geometry.mode === 'scale'
          ? (ends[ends.length - 1] ?? 0)
          : (ends[Math.min(n + (frac > 0.35 ? 1 : 0), ends.length - 1)] ?? 0);
      branches.current.geometry.setDrawRange(0, count);
    }

    const g = stage / info.maxStage;
    const leafScale = 0.6 + 0.4 * Math.min(1, Math.max(0, g));
    const skeleton = geometry.skeleton;
    for (const [kind, indices] of kinds) {
      const mesh = leafRefs.current.get(kind);
      if (!mesh) continue;
      indices.forEach((leafIndex, i) => {
        const leaf = skeleton.leaves[leafIndex];
        if (!leaf || !look.leaves || (hashString(`k${leafIndex}`) % 1000) / 1000 >= look.density) {
          mesh.setMatrixAt(i, ZERO);
          return;
        }
        let v = 1;
        if (geometry.mode === 'levels') {
          if (leaf.until <= n || leaf.born > n + 1) v = 0;
          else {
            if (leaf.born === n + 1) v *= frac;
            if (leaf.until === n + 1) v *= 1 - frac;
          }
        }
        if (v < 0.02) {
          mesh.setMatrixAt(i, ZERO);
          return;
        }
        const size = geometry.mode === 'levels' ? (leaf.size * leafScale * v) / scale : leaf.size * v;
        tmp.d.set(leaf.d[0], leaf.d[1], leaf.d[2]).normalize();
        tmp.q.setFromUnitVectors(Y, tmp.d);
        const offset = kind === 'blob' ? 0 : size * 0.5;
        tmp.p.set(leaf.p[0], leaf.p[1], leaf.p[2]).addScaledVector(tmp.d, offset);
        tmp.s.setScalar(size);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(i, tmp.m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }

    if (blooms.current) {
      const list = skeleton.blooms;
      list.forEach((b, i) => {
        const fruit = info.fruit !== undefined && b.rank < plant.fruit;
        const open = b.rank < plant.bloom && !look.wilted;
        const visible = (geometry.mode === 'scale' || b.born <= n) && (open || fruit);
        if (!visible) {
          blooms.current?.setMatrixAt(i, ZERO);
          return;
        }
        const size =
          (geometry.mode === 'levels' ? (b.size * leafScale) / scale : b.size) * (b.kind === 'head' ? 1.7 : 1);
        tmp.p.set(b.p[0], b.p[1] - (fruit ? size * 0.5 : 0), b.p[2]);
        tmp.q.identity();
        if (b.kind === 'spike' || b.kind === 'cattail')
          tmp.q.setFromUnitVectors(Y, tmp.d.set(b.d[0], b.d[1], b.d[2]).normalize());
        if (b.kind === 'spike' || b.kind === 'cattail') tmp.s.set(size * 0.35, size * 1.4, size * 0.35);
        else if (b.kind === 'head') tmp.s.set(size, size, size * 0.3);
        else tmp.s.setScalar(size);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        blooms.current?.setMatrixAt(i, tmp.m);
        blooms.current?.setColorAt(i, tmp.c.set(bloomColor(b.kind, look, fruit)));
      });
      blooms.current.instanceMatrix.needsUpdate = true;
      if (blooms.current.instanceColor) blooms.current.instanceColor.needsUpdate = true;
    }
  });

  if (!geometry || !look.visible) return null;
  return (
    <group ref={group}>
      <mesh ref={branches} geometry={geometry.branches} material={material(look.bark)} castShadow />
      {[...kinds].map(([kind, indices]) => (
        <instancedMesh
          key={kind}
          ref={(mesh) => {
            if (mesh) leafRefs.current.set(kind, mesh);
            else leafRefs.current.delete(kind);
          }}
          args={[LEAF_SHAPES[kind], leafMaterial, indices.length]}
          castShadow
          frustumCulled={false}
        />
      ))}
      {geometry.skeleton.blooms.length > 0 && (
        <instancedMesh
          ref={blooms}
          args={[BLOOM_SHAPE, bloomMaterial, geometry.skeleton.blooms.length]}
          frustumCulled={false}
        />
      )}
    </group>
  );
}
