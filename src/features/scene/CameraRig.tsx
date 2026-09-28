'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { groundAt, rowZ, sceneX } from './model';
import { useScene } from './store';

/**
 * The camera follows presets instead of free controls – pages direct it, the rig eases
 * between shots. A gentle sway and a small pointer parallax keep it alive.
 */

const SHOTS = {
  hero: { target: [2, 2.6, 0], dist: 80, polar: 1.3, az: 1.42 },
  overview: { target: [0, 2.6, 0], dist: 72, polar: 1.2, az: 1.24 },
  side: { target: [0, 3.2, 0], dist: 74, polar: 1.43, az: Math.PI / 2 },
  top: { target: [0, 0, 0], dist: 64, polar: 0.52, az: Math.PI / 2 },
  far: { target: [0, 1, 0], dist: 96, polar: 1.25, az: 1.0 },
  low: { target: [-4, 3.2, 0], dist: 32, polar: 1.42, az: 0.32 },
  focus: { target: [0, 1.5, 0], dist: 12, polar: 1.18, az: 1.3 },
} as const;

export function CameraRig({ still }: { still: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const current = useRef({ pos: new THREE.Vector3(20, 14, 50), target: new THREE.Vector3(0, 0, 0), ready: false });
  const shift = useRef({ x: 0, y: 0 });
  const time = useRef(0);
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    const { camera: preset, focus, orbit, shift: wantShift, shiftY: wantShiftY } = useScene.getState();
    const dt = Math.min(delta, 0.1);
    time.current += dt;
    const p = pointer.current;
    p.x += (p.tx - p.x) * (1 - Math.exp(-dt * 3));
    p.y += (p.ty - p.y) * (1 - Math.exp(-dt * 3));

    const shot = SHOTS[preset];
    tmp.target.set(shot.target[0], shot.target[1], shot.target[2]);
    if (preset === 'focus' && focus) tmp.target.set(sceneX(focus.x), groundAt(focus.x) + 1.8, rowZ(focus.row));
    // portrait screens look along the garden instead of across it, so it stays large
    const aspect = size.width / Math.max(1, size.height);
    const portrait = aspect < 0.9 && preset !== 'focus' && preset !== 'top';
    const dist = portrait ? shot.dist * 0.62 : shot.dist;
    const sway = orbit && !still ? Math.sin(time.current * 0.07) * 0.14 : 0;
    const az = (portrait ? Math.min(shot.az, 0.62) : shot.az) + sway + (still ? 0 : p.x * 0.12);
    const po = THREE.MathUtils.clamp(shot.polar + (still ? 0 : p.y * 0.035), 0.2, 1.5);
    tmp.pos.set(
      tmp.target.x + dist * Math.sin(po) * Math.cos(az),
      tmp.target.y + dist * Math.cos(po),
      tmp.target.z + dist * Math.sin(po) * Math.sin(az),
    );

    const c = current.current;
    const k = c.ready ? 1 - Math.exp(-dt * (still ? 20 : 2.2)) : 1;
    c.pos.lerp(tmp.pos, k);
    c.target.lerp(tmp.target, k);
    c.ready = true;
    camera.position.copy(c.pos);
    camera.lookAt(c.target);

    const sh = shift.current;
    sh.x += (wantShift - sh.x) * (1 - Math.exp(-dt * 3));
    sh.y += (wantShiftY - sh.y) * (1 - Math.exp(-dt * 3));
    if (Math.abs(sh.x) > 0.001 || Math.abs(sh.y) > 0.001) {
      camera.setViewOffset(size.width, size.height, -sh.x * size.width, -sh.y * size.height, size.width, size.height);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    }
  });

  return null;
}
