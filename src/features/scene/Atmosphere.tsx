'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createRng, type Condition, type World } from '@/features/garden';
import { clock } from './clock';
import { conditionAt, indexAt } from './model';
import { useScene } from './store';

/**
 * The weather made visible: light, fog, clouds and falling rain or snow for the displayed
 * day (or the previewed condition). It also tells the page which weather it shows, so the
 * CSS sky behind the transparent canvas changes with it.
 */

interface Mood {
  sun: number;
  hemi: number;
  sunColor: string;
  fog: string;
  clouds: number;
  cloud: string;
}

const MOODS: Record<Condition | 'calm', Mood> = {
  calm: { sun: 2.4, hemi: 1.1, sunColor: '#fff0d6', fog: '#e6f0e8', clouds: 0.3, cloud: '#ffffff' },
  sun: { sun: 2.8, hemi: 1.15, sunColor: '#fff0d0', fog: '#e3efe9', clouds: 0.2, cloud: '#ffffff' },
  cloudy: { sun: 1.3, hemi: 1.25, sunColor: '#e8eef2', fog: '#d9e0e3', clouds: 0.85, cloud: '#e9edf0' },
  rain: { sun: 0.9, hemi: 1.2, sunColor: '#d6e0e8', fog: '#c3ccd3', clouds: 1, cloud: '#aab5be' },
  storm: { sun: 0.7, hemi: 1.05, sunColor: '#cdd6de', fog: '#a9b3bb', clouds: 1, cloud: '#7e8a95' },
  snow: { sun: 1.4, hemi: 1.35, sunColor: '#eef4fa', fog: '#e9eef2', clouds: 0.8, cloud: '#e6ebef' },
  frost: { sun: 2.2, hemi: 1.2, sunColor: '#f4f8ff', fog: '#e8f2f7', clouds: 0.15, cloud: '#ffffff' },
};
const NIGHT_FOG = '#0f1d16';

function useCondition(world: World): React.RefObject<Condition | undefined> {
  const ref = useRef<Condition | undefined>(undefined);
  useFrame(() => {
    const preview = useScene.getState().preview;
    ref.current = preview ?? conditionAt(world, clock.day);
  });
  return ref;
}

const RAIN = 900;
const SNOW = 600;
const BOX = { x: 72, y: 26, z: 20 };

function Particles({ condition, still }: { condition: React.RefObject<Condition | undefined>; still: boolean }) {
  const rain = useRef<THREE.InstancedMesh>(null);
  const snow = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const rng = createRng(7);
    return Array.from({ length: Math.max(RAIN, SNOW) }, () => [rng(), rng(), rng(), rng()] as const);
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);

  useFrame(() => {
    const c = condition.current;
    const t = still ? 0 : clock.time;
    const raining = c === 'rain' || c === 'storm';
    if (rain.current) {
      const slant = c === 'storm' ? 0.45 : 0.08;
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), slant);
      const count = raining ? (c === 'storm' ? RAIN : RAIN * 0.75) : 0;
      for (let i = 0; i < RAIN; i++) {
        if (i >= count) {
          rain.current.setMatrixAt(i, zero);
          continue;
        }
        const [a, b, d, e] = seeds[i] ?? [0, 0, 0, 0];
        const fall = (b * BOX.y - t * (16 + e * 6)) % BOX.y;
        const y = fall < 0 ? fall + BOX.y : fall;
        p.set((a - 0.5) * BOX.x - (BOX.y - y) * slant, y - 2, (d - 0.5) * BOX.z);
        m.compose(p, q, s);
        rain.current.setMatrixAt(i, m);
      }
      rain.current.instanceMatrix.needsUpdate = true;
    }
    if (snow.current) {
      const count = c === 'snow' ? SNOW : 0;
      q.identity();
      for (let i = 0; i < SNOW; i++) {
        if (i >= count) {
          snow.current.setMatrixAt(i, zero);
          continue;
        }
        const [a, b, d, e] = seeds[i] ?? [0, 0, 0, 0];
        const fall = (b * BOX.y - t * (1.2 + e)) % BOX.y;
        const y = fall < 0 ? fall + BOX.y : fall;
        p.set((a - 0.5) * BOX.x + Math.sin(t * 0.8 + i) * 0.4, y - 2, (d - 0.5) * BOX.z + Math.cos(t * 0.6 + i) * 0.3);
        m.compose(p, q, s);
        snow.current.setMatrixAt(i, m);
      }
      snow.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={rain} args={[undefined, undefined, RAIN]} frustumCulled={false}>
        <boxGeometry args={[0.025, 0.55, 0.025]} />
        <meshBasicMaterial color="#dbe8f2" transparent opacity={0.55} />
      </instancedMesh>
      <instancedMesh ref={snow} args={[undefined, undefined, SNOW]} frustumCulled={false}>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>
    </>
  );
}

function Clouds({
  condition,
  night,
  still,
}: {
  condition: React.RefObject<Condition | undefined>;
  night: boolean;
  still: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const puffMaterial = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#ffffff',
        emissive: '#dfe8ee',
        flatShading: true,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  );
  const clouds = useMemo(() => {
    const rng = createRng(21);
    return Array.from({ length: 9 }, (_, i) => ({
      x: -40 + i * 10 + rng() * 6,
      y: 14 + rng() * 5,
      z: -10 - rng() * 14,
      speed: 0.25 + rng() * 0.3,
      puffs: Array.from({ length: 4 + Math.floor(rng() * 3) }, (_, k) => ({
        x: k * 1.3 - 2 + rng() * 0.6,
        y: rng() * 0.7,
        z: rng() * 1.2 - 0.6,
        s: 1.4 + rng() * 1.2,
      })),
    }));
  }, []);
  const shown = useRef(0.3);
  useFrame((_, delta) => {
    const mood = MOODS[condition.current ?? 'calm'];
    shown.current += (mood.clouds - shown.current) * (1 - Math.exp(-Math.min(delta, 0.1) * 1.5));
    puffMaterial.color.lerp(new THREE.Color(night ? '#2d3f35' : mood.cloud), 0.05);
    puffMaterial.emissive.set(night ? '#0c1611' : '#c9d3da');
    puffMaterial.opacity = night ? 0.45 : 0.95;
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const c = clouds[i];
      if (!c) return;
      const visible = i < Math.round(shown.current * clouds.length);
      child.visible = visible;
      const x = ((c.x + (still ? 0 : clock.time * c.speed) + 50) % 100) - 50;
      child.position.set(x, c.y, c.z);
    });
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={[p.x, p.y, p.z]} scale={[p.s * 1.3, p.s * 0.8, p.s]} material={puffMaterial}>
              <icosahedronGeometry args={[0.5, 1]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Atmosphere({ world, night, still }: { world: World; night: boolean; still: boolean }) {
  const condition = useCondition(world);
  const scene = useThree((s) => s.scene);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const lastWeather = useRef<string | null>(null);

  useFrame((_, delta) => {
    clock.time += still ? 0 : Math.min(delta, 0.1);
    const c = condition.current;
    const mood = MOODS[c ?? 'calm'];
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 2);
    if (sun.current) {
      sun.current.intensity += ((night ? 1.3 : mood.sun) - sun.current.intensity) * k;
      sun.current.color.lerp(new THREE.Color(night ? '#c8d8ff' : mood.sunColor), k);
    }
    if (hemi.current) hemi.current.intensity += ((night ? 0.9 : mood.hemi) - hemi.current.intensity) * k;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.lerp(new THREE.Color(night ? NIGHT_FOG : mood.fog), k);
    const name = c ?? 'calm';
    if (name !== lastWeather.current && typeof document !== 'undefined') {
      lastWeather.current = name;
      document.documentElement.dataset.weather = name;
    }
    // keep the day index warm for the camera and HUDs
    indexAt(world, clock.day);
  });

  return (
    <>
      <primitive object={target} position={[4, 0, 0]} />
      <hemisphereLight ref={hemi} args={night ? ['#9ab4c6', '#1c2c24', 0.9] : ['#e8f4ff', '#e6d8b0', 1.1]} />
      <directionalLight
        ref={sun}
        position={night ? [-24, 30, 14] : [30, 34, 22]}
        target={target}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
      <Clouds condition={condition} night={night} still={still} />
      <Particles condition={condition} still={still} />
    </>
  );
}
