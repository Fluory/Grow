'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { World } from '@/features/garden';
import { useReducedMotion } from '@/shared/motion';
import { Atmosphere } from './Atmosphere';
import { CameraRig } from './CameraRig';
import { clock } from './clock';
import { Ground } from './Ground';
import { Meadow } from './Meadow';
import { lastDay } from './model';
import { Plants } from './Plants';
import { activeWorld, useScene } from './store';
import { Structures } from './Structures';
import { Water } from './Water';

/** Eases the displayed day towards the requested one – the garden grows instead of jumping. */
function DayDirector({ world, still }: { world: World; still: boolean }) {
  const shown = useRef<World | null>(null);
  useFrame((_, delta) => {
    const last = lastDay(world);
    const wanted = useScene.getState().day;
    const target = Math.max(0, Math.min(Number.isFinite(wanted) ? wanted : last, last));
    clock.target = target;
    const gap = target - clock.day;
    // a different garden (real ↔ simulation) cuts instead of growing through unrelated days
    const switched = shown.current !== world;
    shown.current = world;
    if (still || switched || Math.abs(gap) < 0.0005) {
      clock.day = target;
    } else {
      const dt = Math.min(delta, 0.1);
      const eased = gap * (1 - Math.exp(-dt * 4));
      const minimum = Math.sign(gap) * Math.min(Math.abs(gap), dt * 3);
      clock.day += Math.abs(eased) > Math.abs(minimum) ? eased : minimum;
    }
  }, -1);
  return null;
}

function Garden({ world, night, still }: { world: World; night: boolean; still: boolean }) {
  return (
    <>
      <DayDirector world={world} still={still} />
      <Atmosphere world={world} night={night} still={still} />
      <Ground world={world} />
      <Meadow world={world} />
      <Water world={world} />
      <Plants world={world} />
      <Structures world={world} night={night} />
      <CameraRig still={still} />
    </>
  );
}

async function load(path: string): Promise<World | null> {
  try {
    const res = await fetch(path);
    return res.ok ? ((await res.json()) as World) : null;
  } catch {
    return null;
  }
}

export default function SceneCanvas() {
  const world = useScene((s) => activeWorld(s));
  const source = useScene((s) => s.source);
  const night = useScene((s) => s.night);
  const dim = useScene((s) => s.dim);
  const still = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useScene.getState().real) return;
    let cancelled = false;
    void load('/data/world.json').then((w) => {
      if (w && !cancelled) useScene.getState().set({ real: w });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (source !== 'simulation' || useScene.getState().simulation) return;
    let cancelled = false;
    void load('/data/simulation.json').then((w) => {
      if (w && !cancelled) useScene.getState().set({ simulation: w });
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: ready ? 1 - dim * 0.6 : 0,
        transform: `scale(${1 + dim * 0.03})`,
        transition: 'opacity 900ms cubic-bezier(.22,1,.36,1), transform 900ms cubic-bezier(.22,1,.36,1)',
      }}
    >
      {world && (
        <Canvas
          shadows
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 34, near: 0.1, far: 700, position: [20, 16, 50] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.setClearColor(0x000000, 0);
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            requestAnimationFrame(() => setReady(true));
          }}
        >
          <fog attach="fog" args={[night ? '#0f1d16' : '#e6f0e8', 90, 330]} />
          <Garden key={world.name} world={world} night={night} still={still} />
        </Canvas>
      )}
    </div>
  );
}
