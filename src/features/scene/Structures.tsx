'use client';

import { CHANNEL, growth, SPECIES, type Structure, type World } from '@/features/garden';
import { groundAt, HALF, rowZ, sceneX } from './model';
import { material } from './PlantMesh';
import { useDisplayedGarden } from './useDisplayed';
import { waterSurface } from './Water';

/** Low-poly models of everything the gardener builds (and the storm's paper boat). */

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p} material={material(c)} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Model({ s, treeHeight, night, water }: { s: Structure; treeHeight: number; night: boolean; water: number }) {
  switch (s.type) {
    case 'stone':
      return (
        <group>
          <mesh position={[0, 0.16, 0]} scale={[1, 0.62, 0.8]} material={material('#9a9a8e')} castShadow>
            <dodecahedronGeometry args={[0.36, 0]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} scale={[0.8, 0.25, 0.6]} material={material('#6f9a4a')}>
            <dodecahedronGeometry args={[0.36, 0]} />
          </mesh>
        </group>
      );
    case 'bench':
      return (
        <group>
          <Box p={[0, 0.5, 0]} s={[1.6, 0.1, 0.45]} c="#9c6b3f" />
          <Box p={[0, 0.85, -0.2]} s={[1.6, 0.35, 0.08]} c="#9c6b3f" />
          <Box p={[-0.65, 0.25, 0]} s={[0.1, 0.5, 0.4]} c="#5a4432" />
          <Box p={[0.65, 0.25, 0]} s={[0.1, 0.5, 0.4]} c="#5a4432" />
        </group>
      );
    case 'birdhouse':
      return (
        <group position={[0, treeHeight * 0.42, 0.28]}>
          <Box p={[0, 0, 0]} s={[0.4, 0.45, 0.4]} c="#c98a4b" />
          <mesh position={[0, 0.34, 0]} rotation={[0, Math.PI / 4, 0]} material={material('#b5412f')}>
            <coneGeometry args={[0.38, 0.3, 4]} />
          </mesh>
        </group>
      );
    case 'beehive':
      return (
        <group>
          <Box p={[0, 0.18, 0]} s={[0.8, 0.34, 0.7]} c="#e8c77a" />
          <Box p={[0, 0.52, 0]} s={[0.8, 0.34, 0.7]} c="#f0d48c" />
          <Box p={[0, 0.86, 0]} s={[0.8, 0.34, 0.7]} c="#e8c77a" />
          <mesh position={[0, 1.15, 0]} rotation={[0, Math.PI / 4, 0]} material={material('#7a5a3e')}>
            <coneGeometry args={[0.66, 0.3, 4]} />
          </mesh>
        </group>
      );
    case 'lantern':
      return (
        <group>
          <Box p={[0, 0.8, 0]} s={[0.08, 1.6, 0.08]} c="#3b3a36" />
          <mesh
            position={[0, 1.75, 0]}
            material={material(night ? '#ffd36e' : '#f3dca0', {
              emissive: night ? '#ffb347' : '#000000',
              emissiveIntensity: night ? 2.2 : 0,
            })}
          >
            <boxGeometry args={[0.26, 0.3, 0.26]} />
          </mesh>
          {night && <pointLight position={[0, 1.8, 0.2]} color="#ffc46b" intensity={4} distance={6} decay={1.6} />}
        </group>
      );
    case 'shed':
      return (
        <group>
          <Box p={[0, 0.95, 0]} s={[2.8, 1.9, 1.8]} c="#9a7250" />
          <mesh position={[0, 2.25, 0]} rotation={[0, 0, 0]} material={material('#5e6b52')} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 3.1, 3, 1, false, Math.PI / 2]} />
          </mesh>
          <Box p={[0, 0.6, 0.91]} s={[0.7, 1.2, 0.04]} c="#6a4a34" />
          <mesh
            position={[0.9, 1.3, 0.91]}
            material={material(night ? '#ffd36e' : '#cfe6ef', {
              emissive: night ? '#ffb347' : '#000000',
              emissiveIntensity: night ? 1.4 : 0,
            })}
          >
            <boxGeometry args={[0.5, 0.45, 0.04]} />
          </mesh>
        </group>
      );
    case 'barrel':
      return (
        <mesh position={[0, 0.45, 0]} material={material('#8a5e37')} castShadow>
          <cylinderGeometry args={[0.36, 0.34, 0.9, 10]} />
        </mesh>
      );
    case 'sundial':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} material={material('#cfc6b4')}>
            <cylinderGeometry args={[0.2, 0.26, 0.9, 8]} />
          </mesh>
          <mesh position={[0, 0.92, 0]} material={material('#b9ae98')}>
            <cylinderGeometry args={[0.42, 0.42, 0.06, 12]} />
          </mesh>
          <mesh position={[0.08, 1.08, 0]} rotation={[0, 0, -0.6]} material={material('#8a6a3e')}>
            <boxGeometry args={[0.04, 0.34, 0.12]} />
          </mesh>
        </group>
      );
    case 'scarecrow':
      return (
        <group>
          <Box p={[0, 1.15, 0]} s={[0.1, 2.3, 0.1]} c="#6a4a34" />
          <Box p={[0, 1.75, 0]} s={[1.6, 0.08, 0.08]} c="#6a4a34" />
          <Box p={[0, 1.35, 0]} s={[0.9, 0.8, 0.3]} c="#b5412f" />
          <mesh position={[0, 2.1, 0]} material={material('#e8c77a')}>
            <icosahedronGeometry args={[0.24, 0]} />
          </mesh>
          <mesh position={[0, 2.38, 0]} material={material('#5a4432')}>
            <coneGeometry args={[0.36, 0.34, 8]} />
          </mesh>
        </group>
      );
    case 'snowman':
      return (
        <group>
          <mesh position={[0, 0.42, 0]} material={material('#fbfdff')} castShadow>
            <icosahedronGeometry args={[0.46, 1]} />
          </mesh>
          <mesh position={[0, 1.06, 0]} material={material('#fbfdff')} castShadow>
            <icosahedronGeometry args={[0.34, 1]} />
          </mesh>
          <mesh position={[0, 1.54, 0]} material={material('#fbfdff')} castShadow>
            <icosahedronGeometry args={[0.24, 1]} />
          </mesh>
          <mesh position={[0, 1.54, 0.3]} rotation={[Math.PI / 2, 0, 0]} material={material('#ec8a2e')}>
            <coneGeometry args={[0.05, 0.26, 6]} />
          </mesh>
          <Box p={[0, 1.8, 0]} s={[0.32, 0.3, 0.32]} c="#2a2a2a" />
        </group>
      );
    case 'boat':
      return (
        <group rotation={[0, 0.4, 0]}>
          <Box p={[0, 0.08, 0]} s={[0.9, 0.14, 0.34]} c="#fbfbf6" />
          <mesh position={[0, 0.4, 0]} material={material('#eeeee6')}>
            <coneGeometry args={[0.2, 0.5, 3]} />
          </mesh>
        </group>
      );
    case 'stepping':
      return (
        <group position={[0, Math.max(0, water), 0]}>
          {[-2, -1, 0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[i * 0.95, 0.02, (i % 2) * 0.25]}
              scale={[1, 0.4, 0.8]}
              material={material(i % 2 ? '#a3a39a' : '#8f8f86')}
            >
              <dodecahedronGeometry args={[0.36, 0]} />
            </mesh>
          ))}
        </group>
      );
    case 'bridge':
      return (
        <group position={[0, 0.9, 0]}>
          {[-2.2, -1.1, 0, 1.1, 2.2].map((x, i) => (
            <Box
              key={i}
              p={[x, 0.35 - Math.abs(x) * 0.12, 0]}
              s={[1.12, 0.12, 1.2]}
              c={i % 2 ? '#8a6a48' : '#7a5a3e'}
            />
          ))}
          <Box p={[0, 0.85, -0.55]} s={[5, 0.08, 0.08]} c="#5a4432" />
          <Box p={[0, 0.85, 0.55]} s={[5, 0.08, 0.08]} c="#5a4432" />
        </group>
      );
  }
}

export function Structures({ world, night }: { world: World; night: boolean }) {
  const { garden } = useDisplayedGarden(world);
  if (!garden) return null;
  const level = garden.nature.water;
  return (
    <group>
      {garden.structures.map((s) => {
        const tree = s.on ? garden.plants.find((p) => p.id === s.on) : undefined;
        const channel = s.type === 'stepping' || s.type === 'bridge';
        const x = channel ? CHANNEL.center - HALF : sceneX(s.x);
        const y = channel ? (s.type === 'bridge' ? 0 : waterSurface(level, CHANNEL.center)) : groundAt(s.x);
        return (
          <group key={s.id} position={[x, s.type === 'stepping' ? 0 : y, rowZ(s.row)]}>
            <Model
              s={s}
              night={night}
              water={s.type === 'stepping' ? y : 0}
              treeHeight={tree ? SPECIES[tree.species].height * growth(tree) : 3}
            />
          </group>
        );
      })}
    </group>
  );
}
