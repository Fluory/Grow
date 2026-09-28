'use client';

import { create } from 'zustand';
import type { Condition, World } from '@/features/garden';

/**
 * Shared state between the pages and the one persistent 3D canvas. Pages never touch
 * three.js – they only tell the scene *what* to show (which garden, which day, where to look).
 */

export type CameraPreset = 'hero' | 'overview' | 'side' | 'top' | 'focus' | 'far' | 'low';
export type Source = 'real' | 'simulation';

export interface Focus {
  x: number;
  row: number;
}

interface SceneState {
  real: World | null;
  simulation: World | null;
  source: Source;
  /** Day shown by the garden (Infinity = today). */
  day: number;
  camera: CameraPreset;
  focus: Focus | null;
  /** 0 = full scene, 1 = scene faded behind text-heavy pages. */
  dim: number;
  orbit: boolean;
  /** Horizontal shift of the picture (fraction of the viewport) to make room for text. */
  shift: number;
  /** Vertical shift (fraction of the viewport height); positive moves the garden down. */
  shiftY: number;
  night: boolean;
  /** Preview a weather condition regardless of the day (the rules section). */
  preview: Condition | null;
  set: (patch: Partial<Omit<SceneState, 'set'>>) => void;
}

export const useScene = create<SceneState>((set) => ({
  real: null,
  simulation: null,
  source: 'real',
  day: Number.POSITIVE_INFINITY,
  camera: 'hero',
  focus: null,
  dim: 0,
  orbit: true,
  shift: 0,
  shiftY: 0,
  night: false,
  preview: null,
  set: (patch) => set(patch),
}));

export function activeWorld(state: Pick<SceneState, 'real' | 'simulation' | 'source'>): World | null {
  return state.source === 'simulation' ? (state.simulation ?? state.real) : state.real;
}
