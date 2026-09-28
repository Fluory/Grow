'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { CHANNEL, groundHeight, hashString, seasonOf, type World } from '@/features/garden';
import { meadowFor, mix, SOIL } from '@/features/render';
import { DEPTH, HALF, SOIL_BOTTOM } from './model';
import { useScene } from './store';
import { useDisplayedGarden } from './useDisplayed';

/**
 * The garden as a floating slab of earth: a grassy top that follows the terrain profile
 * (with the stream's trough) and walls that show the soil layers – the 3D twin of the SVG's
 * cross-section. Colours follow the season, the recent rain and the snow.
 */

type Part = 'top' | 'edge' | 'soil' | 'mid' | 'deep' | 'bottom';

interface GroundData {
  geometry: THREE.BufferGeometry;
  parts: Part[];
  xs: number[];
}

const STEP = 0.5;
const Z_STEP = 0.75;
const HALF_DEPTH = DEPTH / 2;
const LAYERS: [Part, number, number][] = [
  ['edge', 0, 0.22],
  ['soil', 0.22, 1.1],
  ['mid', 1.1, 2.4],
  ['deep', 2.4, 99],
];

function build(): GroundData {
  const pos: number[] = [];
  const parts: Part[] = [];
  const xs: number[] = [];
  const push = (part: Part, ...vertices: [number, number, number][]) => {
    for (const v of vertices) {
      pos.push(v[0] - HALF, v[1], v[2]);
      parts.push(part);
      xs.push(v[0]);
    }
  };
  const bump = (x: number, z: number) => ((hashString(`${x}:${z}`) % 100) / 100 - 0.5) * 0.05;
  const h = (x: number, z: number) =>
    groundHeight(x) + (Math.abs(z) < HALF_DEPTH - 0.01 && x > 0.01 && x < 63.99 ? bump(x, z) : 0);

  // top surface
  for (let x = 0; x < 64 - 1e-6; x += STEP) {
    for (let z = -HALF_DEPTH; z < HALF_DEPTH - 1e-6; z += Z_STEP) {
      const a: [number, number, number] = [x, h(x, z), z];
      const b: [number, number, number] = [x + STEP, h(x + STEP, z), z];
      const c: [number, number, number] = [x + STEP, h(x + STEP, z + Z_STEP), z + Z_STEP];
      const d: [number, number, number] = [x, h(x, z + Z_STEP), z + Z_STEP];
      push('top', a, d, b, b, d, c);
    }
  }
  // front and back walls with soil layers
  for (const side of [1, -1]) {
    const z = side * HALF_DEPTH;
    for (let x = 0; x < 64 - 1e-6; x += STEP) {
      const h0 = groundHeight(x);
      const h1 = groundHeight(x + STEP);
      for (const [part, top, bottom] of LAYERS) {
        const a: [number, number, number] = [x, h0 - top, z];
        const b: [number, number, number] = [x + STEP, h1 - top, z];
        const c: [number, number, number] = [x + STEP, Math.max(SOIL_BOTTOM, h1 - bottom), z];
        const d: [number, number, number] = [x, Math.max(SOIL_BOTTOM, h0 - bottom), z];
        if (side === 1) push(part, a, d, b, b, d, c);
        else push(part, a, b, d, b, c, d);
      }
    }
  }
  // left and right walls
  for (const [x, side] of [
    [0, -1],
    [64, 1],
  ] as const) {
    const hx = groundHeight(x);
    for (const [part, top, bottom] of LAYERS) {
      const a: [number, number, number] = [x, hx - top, -HALF_DEPTH];
      const b: [number, number, number] = [x, hx - top, HALF_DEPTH];
      const c: [number, number, number] = [x, Math.max(SOIL_BOTTOM, hx - bottom), HALF_DEPTH];
      const d: [number, number, number] = [x, Math.max(SOIL_BOTTOM, hx - bottom), -HALF_DEPTH];
      if (side === 1) push(part, a, b, d, b, c, d);
      else push(part, a, d, b, b, d, c);
    }
  }
  // bottom
  push(
    'bottom',
    [0, SOIL_BOTTOM, -HALF_DEPTH],
    [64, SOIL_BOTTOM, -HALF_DEPTH],
    [0, SOIL_BOTTOM, HALF_DEPTH],
    [64, SOIL_BOTTOM, -HALF_DEPTH],
    [64, SOIL_BOTTOM, HALF_DEPTH],
    [0, SOIL_BOTTOM, HALF_DEPTH],
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  geometry.computeVertexNormals();
  return { geometry, parts, xs };
}

function paint(data: GroundData, colors: Record<Part, string>, sand: string): void {
  const attr = data.geometry.getAttribute('color') as THREE.BufferAttribute;
  const c = new THREE.Color();
  const sandColor = new THREE.Color(sand);
  const top = new THREE.Color(colors.top);
  data.parts.forEach((part, i) => {
    if (part === 'top') {
      const x = data.xs[i] ?? 0;
      const inChannel = Math.abs(x - CHANNEL.center) < CHANNEL.halfWidth - 0.6;
      c.copy(inChannel ? sandColor : top);
    } else {
      c.set(colors[part]);
    }
    attr.setXYZ(i, c.r, c.g, c.b);
  });
  attr.needsUpdate = true;
}

const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });

export function Ground({ world }: { world: World }) {
  const data = useMemo(() => build(), []);
  const { index, garden } = useDisplayedGarden(world);
  const season = garden ? seasonOf(garden.date) : 'autumn';
  const snow = garden?.nature.snow ?? 0;
  const preview = useScene((s) => s.preview);
  const frost = (preview ?? garden?.weather?.condition) === 'frost';
  const rainy = useMemo(() => {
    const recent = world.days.slice(Math.max(0, index - 20), index + 1).filter((d) => d.weather);
    const wet = recent.filter((d) => (d.weather?.rain ?? 0) >= 1).length;
    return Math.min(1, 0.25 + (wet + Math.max(0, 21 - recent.length) * 0.25) / 8);
  }, [world, index]);

  useMemo(() => {
    const meadow = meadowFor(season, rainy);
    const white = (color: string) =>
      snow > 0 ? mix(color, '#f5f9fc', 0.55 + snow * 0.13) : frost ? mix(color, '#e4eef2', 0.42) : color;
    paint(
      data,
      {
        top: white(meadow.top),
        edge: white(meadow.front),
        soil: SOIL.top,
        mid: SOIL.mid,
        deep: SOIL.deep,
        bottom: '#4a3726',
      },
      white('#e2cf9b'),
    );
  }, [data, season, rainy, snow, frost]);

  return <mesh geometry={data.geometry} material={material} receiveShadow />;
}
