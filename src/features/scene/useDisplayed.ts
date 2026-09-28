'use client';

import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import type { Garden, World } from '@/features/garden';
import { clock } from './clock';
import { gardensOf, indexAt } from './model';

/** The garden on the displayed day; the component re-renders only when that day changes. */
export function useDisplayedGarden(world: World): { index: number; garden: Garden | undefined } {
  const [index, setIndex] = useState(() => indexAt(world, clock.day));
  useFrame(() => {
    const next = indexAt(world, clock.day);
    if (next !== index) setIndex(next);
  });
  return { index, garden: gardensOf(world)[index] };
}
