'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHANNEL, groundHeight, MAX_WATER, waterEdges, waterHeight, type World } from '@/features/garden';
import { clock } from './clock';
import { DEPTH, HALF } from './model';
import { useDisplayedGarden } from './useDisplayed';

/** The stream: a water body in the trough whose surface rises and widens with the level. */

export function waterSurface(level: number, col: number): number {
  const h = waterHeight(level);
  const ground = groundHeight(col + 0.5);
  return h === null ? ground : Math.max(ground, h);
}

/** Cross-section of the water under its surface, as a shape in the x/y plane. */
function sectionShape(level: number): THREE.Shape | null {
  const edges = waterEdges(level);
  const surface = waterHeight(level);
  if (!edges || surface === null) return null;
  const [l, r] = edges;
  const shape = new THREE.Shape();
  shape.moveTo(l - HALF, surface);
  for (let x = l; x <= r; x += 0.2) shape.lineTo(x - HALF, groundHeight(x) + 0.01);
  shape.lineTo(r - HALF, surface);
  shape.closePath();
  return shape;
}

const water = new THREE.MeshStandardMaterial({
  color: '#4f8fb8',
  roughness: 0.18,
  metalness: 0.05,
  transparent: true,
  opacity: 0.82,
  side: THREE.DoubleSide,
});
const ice = new THREE.MeshStandardMaterial({
  color: '#d4ecf5',
  roughness: 0.35,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
});

export function Water({ world }: { world: World }) {
  const { garden } = useDisplayedGarden(world);
  const level = garden?.nature.water ?? 0;
  const frozen = garden?.nature.ice ?? false;
  const surface = useRef<THREE.Mesh>(null);
  const shown = useRef(level);
  const sections = useMemo(() => {
    const list: (THREE.ShapeGeometry | null)[] = [];
    for (let l = 0; l <= MAX_WATER; l++) {
      const shape = sectionShape(l);
      list.push(shape ? new THREE.ShapeGeometry(shape) : null);
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    shown.current += (level - shown.current) * (1 - Math.exp(-Math.min(delta, 0.1) * 3));
    const mesh = surface.current;
    if (!mesh) return;
    const edges = waterEdges(Math.max(1, shown.current));
    const h = waterHeight(Math.max(1, shown.current));
    if (!edges || h === null || shown.current < 0.5) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.set((edges[0] + edges[1]) / 2 - HALF, h + Math.sin(clock.time * 1.3) * 0.01, 0);
    mesh.scale.set(edges[1] - edges[0], 1, 1);
  });

  const section = sections[Math.round(level)] ?? null;
  const mat = frozen ? ice : water;
  return (
    <group>
      <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
        <planeGeometry args={[1, DEPTH - 0.02]} />
      </mesh>
      {section && (
        <>
          <mesh geometry={section} position={[0, 0, DEPTH / 2 + 0.01]} material={mat} />
          <mesh geometry={section} position={[0, 0, -DEPTH / 2 - 0.01]} material={mat} />
        </>
      )}
      {level === 0 && (
        <mesh
          position={[CHANNEL.center - HALF, groundHeight(CHANNEL.center) + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.2, DEPTH - 0.1]} />
          <meshStandardMaterial color="#b89f6a" roughness={1} />
        </mesh>
      )}
    </group>
  );
}
