'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode } from 'react';
import type { Condition } from '@/features/garden';
import { useScene, type CameraPreset, type Focus, type Source } from '@/features/scene';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Props {
  children: ReactNode;
  className?: string;
  id?: string;
  camera: CameraPreset;
  dim?: number;
  shift?: number;
  /** Vertical picture shift on wide screens (positive moves the garden down). */
  shiftY?: number;
  /** Vertical picture shift used on narrow screens instead of the horizontal one. */
  mobileShiftY?: number;
  orbit?: boolean;
  focus?: Focus | null;
  /** Show this weather in the 3D garden while the section is on screen. */
  preview?: Condition | null;
  /** Which garden and day the scene shows (default: today's real garden). */
  source?: Source;
  day?: number;
  labelledBy?: string;
}

/**
 * A story section that directs the 3D scene while it is on screen: when it reaches the
 * middle of the viewport, the camera moves to its shot. Scrolling back restores it.
 */
export function SceneSection({
  children,
  className,
  id,
  camera,
  dim = 0,
  shift = 0,
  shiftY = 0,
  mobileShiftY = 0,
  orbit = true,
  focus = null,
  preview = null,
  source = 'real',
  day = Infinity,
  labelledBy,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const apply = () => {
        const wide = window.innerWidth > 900;
        useScene.getState().set({
          camera,
          dim,
          shift: wide ? shift : 0,
          shiftY: wide ? shiftY : mobileShiftY,
          orbit,
          focus,
          preview,
          day,
          source,
        });
      };
      ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 45%', onEnter: apply, onEnterBack: apply });
    },
    {
      scope: ref,
      dependencies: [camera, dim, shift, shiftY, mobileShiftY, orbit, focus?.x, focus?.row, preview, source, day],
    },
  );
  return (
    <section ref={ref} id={id} className={className} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
