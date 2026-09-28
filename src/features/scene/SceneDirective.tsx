'use client';

import { useEffect } from 'react';
import type { Condition } from '@/features/garden';
import { useScene, type CameraPreset, type Focus, type Source } from './store';

interface Props {
  camera?: CameraPreset;
  day?: number;
  focus?: Focus | null;
  dim?: number;
  orbit?: boolean;
  shift?: number;
  shiftY?: number;
  source?: Source;
  preview?: Condition | null;
}

/**
 * Drop this into any page to direct the persistent 3D scene: which day, which camera shot,
 * how prominent. Values not given fall back to the calm default.
 */
export function SceneDirective({
  camera = 'hero',
  day = Infinity,
  focus = null,
  dim = 0,
  orbit = true,
  shift = 0,
  shiftY = 0,
  source = 'real',
  preview = null,
}: Props) {
  const focusX = focus?.x;
  const focusRow = focus?.row;
  useEffect(() => {
    useScene.getState().set({
      camera,
      day,
      focus: focusX === undefined || focusRow === undefined ? null : { x: focusX, row: focusRow },
      dim,
      orbit,
      shift,
      shiftY,
      source,
      preview,
    });
  }, [camera, day, focusX, focusRow, dim, orbit, shift, shiftY, source, preview]);
  return null;
}
