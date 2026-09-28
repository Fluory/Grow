import type { SpeciesId } from '@/features/garden';

/**
 * The chapters – short case studies of how the garden works. Content lives in
 * src/content/chapters/<slug>.mdx; this list gives them order, cover and summary.
 */
export interface Chapter {
  slug: string;
  no: string;
  title: string;
  summary: string;
  cover: { species: SpeciesId; growth: number; bloom?: number; fruit?: number; date?: string };
  tint: string;
  minutes: number;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    slug: 'why-weather',
    no: '01',
    title: 'Why let the weather decide?',
    summary: 'A garden nobody controls: one real day of Heilbronn weather, one choice, one commit – forever.',
    cover: { species: 'sunflower', growth: 1, bloom: 1 },
    tint: '#f6dd8a',
    minutes: 3,
  },
  {
    slug: 'l-systems',
    no: '02',
    title: 'Plants from grammars',
    summary: 'Lindenmayer systems, a 3D turtle and growth levels: why every rain day adds a ring of branches.',
    cover: { species: 'birch', growth: 0.8 },
    tint: '#cfe3b4',
    minutes: 5,
  },
  {
    slug: 'the-weather-engine',
    no: '03',
    title: 'Rain grows, sun ripens',
    summary: 'Six conditions, a stream that widens, ice, snowmen and storms that fell trees – the rules of nature.',
    cover: { species: 'apple', growth: 0.95, bloom: 30, date: '2026-04-20' },
    tint: '#f3c9cf',
    minutes: 5,
  },
  {
    slug: 'the-routine',
    no: '04',
    title: 'A day in the life of the routine',
    summary: 'What happens between 08:53 and the merge: the weather call, the plan, one pull request, one commit.',
    cover: { species: 'pine', growth: 0.85 },
    tint: '#bfd9e6',
    minutes: 4,
  },
];

export function chapterBySlug(slug: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}
