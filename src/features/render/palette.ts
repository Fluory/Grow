import type { Condition, Season } from '@/features/garden';
import { mix } from './plant-svg';

/** Colours of the garden picture: sky by weather, ground by season, soil and water. */

export interface Sky {
  top: string;
  bottom: string;
  clouds: number;
  cloud: string;
  cloudShade: string;
  sun: string | null;
  hills: [string, string];
}

const SKIES: Record<Condition | 'calm', Omit<Sky, 'hills'>> = {
  calm: { top: '#86bde3', bottom: '#dcedf2', clouds: 0.25, cloud: '#ffffff', cloudShade: '#e2edf3', sun: '#ffe08a' },
  sun: { top: '#6fb1e2', bottom: '#d6ecf3', clouds: 0.15, cloud: '#ffffff', cloudShade: '#e4eef4', sun: '#ffd970' },
  cloudy: { top: '#9aacba', bottom: '#d3dbe1', clouds: 0.8, cloud: '#e7ebee', cloudShade: '#c4ccd3', sun: null },
  rain: { top: '#71849a', bottom: '#b7c3cc', clouds: 0.95, cloud: '#9eabb6', cloudShade: '#808e9a', sun: null },
  storm: { top: '#4b5866', bottom: '#97a2ab', clouds: 1, cloud: '#6e7a85', cloudShade: '#56626d', sun: null },
  snow: { top: '#b7c3cd', bottom: '#eef2f5', clouds: 0.7, cloud: '#e3e8ec', cloudShade: '#ccd4da', sun: null },
  frost: { top: '#97c1e3', bottom: '#eef6fb', clouds: 0.1, cloud: '#ffffff', cloudShade: '#e8f0f5', sun: '#fff3cf' },
};

const HILLS: Record<Season, [string, string]> = {
  spring: ['#a9c79a', '#8fb685'],
  summer: ['#9dbd8a', '#83ab75'],
  autumn: ['#c3b88a', '#a9a878'],
  winter: ['#b9c2bd', '#a4b0ac'],
};

export function skyFor(condition: Condition | undefined, season: Season): Sky {
  const base = SKIES[condition ?? 'calm'];
  const warm = season === 'autumn' ? 0.18 : season === 'summer' ? 0.06 : 0;
  return {
    ...base,
    bottom: warm > 0 ? mix(base.bottom, '#f6d7ac', warm) : base.bottom,
    hills: HILLS[season],
  };
}

/** Meadow colour; `lush` (0–1) comes from the rain of the last weeks. */
export function meadowFor(season: Season, lush: number): { top: string; front: string; blade: string } {
  const green: Record<Season, string> = { spring: '#8cc05a', summer: '#79ad48', autumn: '#98a74f', winter: '#8d9a6c' };
  const dry = '#c2b06a';
  const top = mix(dry, green[season], 0.35 + 0.65 * lush);
  return { top, front: mix(top, '#4a6b2e', 0.35), blade: mix(top, '#3f6a2a', 0.45) };
}

export const SOIL = {
  top: '#5b4331',
  mid: '#6f5039',
  deep: '#80624a',
  stone: '#9c8a74',
  stoneDark: '#6d5c4b',
  root: '#caa47a',
  bulb: '#e9d6b0',
  worm: '#d98b8b',
} as const;

export const WATER = {
  deep: '#4f8fb8',
  surface: '#6fb0d6',
  shine: '#bfe3f2',
  ice: '#d4ecf5',
  iceLine: '#ffffff',
} as const;
export const SAND = { dry: '#e2cf9b', wet: '#cbb37b' } as const;
export const SNOW = '#f7fbff';

export const CAPTION = {
  bg: '#16211a',
  text: '#f3efe2',
  dim: '#a8b8a4',
  accent: '#f4c430',
} as const;

export const CONDITION_COLOR: Record<Condition, string> = {
  sun: '#f4c430',
  cloudy: '#a9b4bc',
  rain: '#5ea3d6',
  frost: '#9fd6ef',
  snow: '#ffffff',
  storm: '#e0673c',
};
