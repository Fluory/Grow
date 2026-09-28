/** Site-wide constants. The repository is the product – every page links back to it. */
export const SITE = {
  name: 'Grow',
  short: 'grow',
  owner: 'Fluory',
  repo: 'Fluory/Grow',
  description:
    'A garden in a public GitHub repository that grows with the real weather in Heilbronn – rain grows, sun ripens, frost stops, storm fells. One Claude routine, one commit a day.',
  routineTime: '08:53',
  timeZone: 'Europe/Berlin',
  siblings: [
    {
      name: 'One Tile a Day',
      repo: 'Fluory/one-tile-a-day',
      tagline: 'A pixel island that grows by exactly one tile a day – by its own rules.',
      image: 'https://raw.githubusercontent.com/Fluory/one-tile-a-day/main/world/isle.svg',
      site: process.env.NEXT_PUBLIC_TILE_URL,
    },
    {
      name: 'Wished into Being',
      repo: 'Fluory/wished-into-being',
      tagline: 'An island where everything was wished for by someone.',
      image: 'https://raw.githubusercontent.com/Fluory/wished-into-being/main/world/isle.svg',
      site: process.env.NEXT_PUBLIC_WISHED_URL,
    },
  ],
} as const;

export function repoUrl(path = ''): string {
  return `https://github.com/${SITE.repo}${path ? `/${path}` : ''}`;
}

/** Absolute site URL: explicit env var, else the Vercel production domain, else localhost. */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (explicit) return new URL(explicit);
  if (vercel) return new URL(`https://${vercel}`);
  return new URL('http://localhost:3000');
}
