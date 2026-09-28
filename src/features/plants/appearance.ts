import { hashString, monthOf, type Plant, type SpeciesId } from '@/features/garden';

/**
 * How a plant looks on a given date: leaf colours through the seasons, bare winter
 * branches, bulbs that hide underground, wilted annuals. Colours only – shapes come from
 * `plantForm`.
 */

export interface Look {
  /** False while a bulb, water lily or mushroom rests out of sight. */
  visible: boolean;
  bark: string;
  /** Leaf shades, or null for bare branches. */
  leaves: readonly string[] | null;
  /** Share of leaves shown (autumn thins the crown). */
  density: number;
  bloom: string;
  bloomCenter: string;
  fruit: string;
  wilted: boolean;
}

const SPRING = ['#a6d46a', '#bfe07f', '#8cc152'];
const SUMMER: Record<string, readonly string[]> = {
  oak: ['#4f8a36', '#629c42', '#3f7630'],
  birch: ['#7cb24e', '#93c460', '#6aa144'],
  apple: ['#5c9840', '#72ab4f', '#4c8736'],
  willow: ['#9cc27f', '#b3d494', '#86ad6c'],
};
const AUTUMN: Record<string, readonly string[]> = {
  oak: ['#c2762f', '#a85a2a', '#d4953a'],
  birch: ['#e8c048', '#d7a731', '#f2d56c'],
  apple: ['#d99a3b', '#c7702f', '#e5b64c'],
  willow: ['#c9c05a', '#b4ab4a', '#d8d27a'],
};
const BARK: Record<SpeciesId, string> = {
  oak: '#5a4432',
  birch: '#e8e2d4',
  pine: '#6e4a30',
  apple: '#6a4a34',
  willow: '#76674a',
  lavender: '#7f8a62',
  fern: '#5f8a44',
  reed: '#8aa060',
  sunflower: '#5e8a3a',
  poppy: '#6f9e4c',
  tulip: '#6fa05a',
  waterlily: '#4f8a4a',
  mushroom: '#efe6d2',
};

const TULIPS = ['#e0433a', '#f2c230', '#e87aa4', '#f4efe4', '#b8327a'];
const DRY = ['#9a7a4a', '#8a6a3e', '#b0915c'];

function deciduous(species: string, month: number): { leaves: readonly string[] | null; density: number } {
  const summer = SUMMER[species] ?? SUMMER.oak ?? SPRING;
  const autumn = AUTUMN[species] ?? AUTUMN.oak ?? SPRING;
  if (month === 3) return { leaves: SPRING, density: 0.18 };
  if (month === 4) return { leaves: SPRING, density: 0.65 };
  if (month >= 5 && month <= 8) return { leaves: summer, density: 1 };
  if (month === 9) return { leaves: [summer[0] ?? '', summer[1] ?? '', autumn[0] ?? ''], density: 1 };
  if (month === 10) return { leaves: autumn, density: 0.85 };
  if (month === 11) return { leaves: autumn, density: 0.3 };
  return { leaves: null, density: 0 };
}

export function lookOf(plant: Plant, date: string): Look {
  const month = monthOf(date);
  const base: Look = {
    visible: true,
    bark: BARK[plant.species],
    leaves: null,
    density: 1,
    bloom: '#ffffff',
    bloomCenter: '#f2c230',
    fruit: '#c8342a',
    wilted: plant.status === 'wilted',
  };
  if (plant.status === 'wilted') return { ...base, bark: '#9a7a4a', leaves: DRY, density: 0.45 };

  switch (plant.species) {
    case 'oak':
    case 'birch':
    case 'willow':
      return { ...base, ...deciduous(plant.species, month) };
    case 'apple':
      return { ...base, ...deciduous('apple', month), bloom: '#f7dbe3', bloomCenter: '#f4c94a', fruit: '#c8342a' };
    case 'pine':
      return { ...base, leaves: ['#2f5d3a', '#3d6e45', '#26503a'] };
    case 'lavender':
      return { ...base, leaves: ['#8aa383', '#9fb596', '#7a9474'], bloom: '#8a6bc2', bloomCenter: '#a58ad6' };
    case 'fern':
      if (month >= 4 && month <= 9) return { ...base, leaves: ['#5c9a3f', '#79b556', '#4a8a35'] };
      if (month === 10) return { ...base, leaves: ['#c9a23d', '#b88f33', '#d8b852'] };
      return { ...base, bark: '#8a6a3e', leaves: DRY, density: 0.55 };
    case 'reed':
      if (month >= 5 && month <= 9) return { ...base, leaves: ['#7da05a', '#93b56a', '#6a904c'], bloom: '#6b4a2e' };
      return { ...base, bark: '#b39c5f', leaves: ['#c4ad6e', '#b39c5f', '#d2bf86'], bloom: '#6b4a2e' };
    case 'sunflower':
      return { ...base, leaves: ['#5e9a3a', '#72ad4a', '#4f8a32'], bloom: '#f4c430', bloomCenter: '#6b3f1d' };
    case 'poppy':
      return { ...base, leaves: ['#6f9e4c', '#84b05e'], bloom: '#e0412e', bloomCenter: '#2a1a1a' };
    case 'tulip':
      return {
        ...base,
        visible: month >= 2 && month <= 5,
        leaves: ['#6fa05a', '#86b46c'],
        bloom: TULIPS[hashString(plant.id) % TULIPS.length] ?? '#e0433a',
        bloomCenter: '#3a2a1a',
      };
    case 'waterlily':
      return {
        ...base,
        visible: month >= 5 && month <= 10,
        leaves: ['#4f8a4a', '#62a05a'],
        bloom: '#f6e2ea',
        bloomCenter: '#f2c230',
      };
    case 'mushroom':
      return {
        ...base,
        visible: month >= 9 && month <= 11,
        bloom: hashString(plant.id) % 3 === 0 ? '#8a5a36' : '#c2412d',
        bloomCenter: '#fff7ea',
      };
  }
}

/** A stable per-plant seed for its L-system. */
export function seedOf(plant: Pick<Plant, 'id' | 'species'>): number {
  return hashString(`${plant.id}:${plant.species}`);
}
