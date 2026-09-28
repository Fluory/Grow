'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHANNEL, createRng, groundHeight, seasonOf, type World } from '@/features/garden';
import { meadowFor, mix } from '@/features/render';
import { clock } from './clock';
import { DEPTH, HALF } from './model';
import { useScene } from './store';
import { useDisplayedGarden } from './useDisplayed';

/**
 * Thousands of grass blades on the meadow – their colour follows the season and the recent
 * rain, and a gentle wind moves them (a single shader uniform, so it costs almost nothing).
 */

const COUNT = 5200;

const blade = (() => {
  const g = new THREE.ConeGeometry(0.035, 0.42, 3, 1, true);
  g.translate(0, 0.21, 0);
  return g;
})();

export function Meadow({ world }: { world: World }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { index, garden } = useDisplayedGarden(world);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#7aa048', roughness: 0.9, flatShading: true });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      m.userData.shader = shader;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           float sway = sin(uTime * 1.6 + base.x * 0.35 + base.z * 0.6) * 0.12 * position.y;
           transformed.x += sway;`,
        );
    };
    return m;
  }, []);

  const matrices = useMemo(() => {
    const rng = createRng(99);
    const out: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; out.length < COUNT && i < COUNT * 3; i++) {
      const x = rng() * 63.4 + 0.3;
      if (Math.abs(x - CHANNEL.center) < CHANNEL.halfWidth - 0.2) continue;
      const z = (rng() - 0.5) * (DEPTH - 0.3);
      e.set((rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5);
      q.setFromEuler(e);
      const s = 0.6 + rng() * 0.9;
      out.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x - HALF, groundHeight(x) - 0.02, z),
          q,
          new THREE.Vector3(s, s, s),
        ),
      );
    }
    return out;
  }, []);

  const season = garden ? seasonOf(garden.date) : 'autumn';
  const snow = garden?.nature.snow ?? 0;
  const preview = useScene((s) => s.preview);
  const frost = (preview ?? garden?.weather?.condition) === 'frost';
  const lush = useMemo(() => {
    const recent = world.days.slice(Math.max(0, index - 20), index + 1).filter((d) => d.weather);
    const wet = recent.filter((d) => (d.weather?.rain ?? 0) >= 1).length;
    return Math.min(1, 0.25 + (wet + Math.max(0, 21 - recent.length) * 0.25) / 8);
  }, [world, index]);

  useMemo(() => {
    const color = meadowFor(season, lush).blade;
    material.color.set(snow > 0 ? mix(color, '#f5f9fc', 0.7) : frost ? mix(color, '#e4eef2', 0.5) : color);
  }, [material, season, lush, snow, frost]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    if (m.userData.ready !== true) {
      matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix));
      m.count = matrices.length;
      m.instanceMatrix.needsUpdate = true;
      m.userData.ready = true;
    }
    const shader = material.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
    if (shader) shader.uniforms.uTime.value = clock.time;
    // fewer, shorter blades after a dry spell, hidden under deep snow
    m.visible = snow < 2;
    m.scale.setScalar(1);
  });

  return <instancedMesh ref={mesh} args={[blade, material, COUNT]} receiveShadow frustumCulled={false} />;
}
