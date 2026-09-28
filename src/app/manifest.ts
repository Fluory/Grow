import type { MetadataRoute } from 'next';
import { SITE } from '@/features/world-data';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: 'Grow',
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f3e8',
    theme_color: '#4f8a36',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
