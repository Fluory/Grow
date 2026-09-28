import type { Metadata } from 'next';
import { GardenExplorer } from '@/features/explorer';
import { getWorld, repoUrl } from '@/features/world-data';
import pageStyles from '../page.module.css';

export const metadata: Metadata = {
  title: 'Garden & timeline',
  description: 'The garden on any day since the empty bed – scrub the timeline, hover a plant to read its story.',
  alternates: { canonical: '/garden' },
};

export default function GardenPage() {
  return (
    <div className={`container ${pageStyles.page}`}>
      <header className={pageStyles.head}>
        <p className="eyebrow">Garden &amp; timeline</p>
        <h1 className="h2">Every day, redrawn.</h1>
        <p className="lede">
          This is the picture the daily commit writes to{' '}
          <a className="link" href={repoUrl('blob/main/world/garden.svg')}>
            world/garden.svg
          </a>
          , for any day you like. Plants are L-systems: every growth level adds a ring of branches, so the rain you see
          in the weather record is the shape you see here.
        </p>
      </header>
      <GardenExplorer real={getWorld()} />
    </div>
  );
}
