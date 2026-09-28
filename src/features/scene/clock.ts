'use client';

/**
 * The day the garden currently *shows*. The store holds the target day; this clock eases
 * towards it every frame so the garden grows instead of jumping. A plain mutable object on
 * purpose – it changes 60 times a second and must not re-render React.
 */
export const clock = {
  day: 0,
  target: 0,
  /** Seconds since the canvas started (for weather particles). */
  time: 0,
};
