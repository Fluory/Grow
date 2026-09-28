'use client';

import { hashString, SPECIES, growth, type Plant } from '@/features/garden';
import { lookOf } from '@/features/plants';
import { material } from './PlantMesh';

/** Plants without an L-system: water lily pads, mushrooms and the logs of fallen trees. */

export function WaterLily({ plant, date }: { plant: Plant; date: string }) {
  const look = lookOf(plant, date);
  if (!look.visible) return null;
  const g = 0.35 + 0.65 * growth(plant);
  const pads: [number, number, number][] = [
    [-0.45, 0.1, 0.55],
    [0.4, -0.2, 0.45],
    [0.05, 0.35, 0.38],
  ];
  const leaf = look.leaves?.[0] ?? '#4f8a4a';
  return (
    <group scale={g}>
      {pads.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.02, z]} material={material(look.leaves?.[i % 2] ?? leaf)}>
          <cylinderGeometry args={[r, r, 0.04, 9]} />
        </mesh>
      ))}
      {pads.slice(0, Math.min(3, plant.bloom)).map(([x, z], i) => (
        <mesh key={`b${i}`} position={[x, 0.14, z]} material={material(look.bloom)}>
          <icosahedronGeometry args={[0.16, 0]} />
        </mesh>
      ))}
    </group>
  );
}

export function Mushroom({ plant, date }: { plant: Plant; date: string }) {
  const look = lookOf(plant, date);
  if (!look.visible) return null;
  const g = 0.45 + 0.55 * growth(plant);
  const caps: [number, number, number][] = [
    [0, 0.42, 0.28],
    [0.42, 0.28, 0.2],
    [-0.36, 0.24, 0.17],
  ];
  return (
    <group scale={g}>
      {caps.slice(0, 1 + Math.min(2, plant.stage)).map(([x, h, r], i) => (
        <group key={i} position={[x, 0, (i - 1) * 0.2]}>
          <mesh position={[0, h / 2, 0]} material={material(look.bark)}>
            <cylinderGeometry args={[r * 0.25, r * 0.3, h, 6]} />
          </mesh>
          <mesh position={[0, h, 0]} material={material(look.bloom)}>
            <sphereGeometry args={[r, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function FallenLog({ plant, date }: { plant: Plant; date: string }) {
  const look = lookOf(plant, date);
  const length = Math.min(5.5, SPECIES[plant.species].height * growth(plant) * 0.55);
  const dir = hashString(plant.id) % 2 === 0 ? 1 : -1;
  const r = 0.3;
  return (
    <group>
      <mesh position={[0, 0.25, 0]} material={material(look.bark)} castShadow>
        <cylinderGeometry args={[r * 1.1, r * 1.25, 0.5, 7]} />
      </mesh>
      <mesh
        position={[dir * (length / 2 + 0.4), r, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={material(look.bark)}
        castShadow
      >
        <cylinderGeometry args={[r * 0.8, r, length, 7]} />
      </mesh>
      <mesh position={[dir * (length + 0.41), r, 0]} rotation={[0, 0, Math.PI / 2]} material={material('#d8b98a')}>
        <cylinderGeometry args={[r * 0.78, r * 0.78, 0.02, 7]} />
      </mesh>
    </group>
  );
}
