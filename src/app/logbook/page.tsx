import type { Metadata } from 'next';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { formatDate, formatMonth, type DayEntry } from '@/features/garden';
import { actionEmoji, weatherBadge } from '@/features/logbook';
import { SceneDirective } from '@/features/scene';
import { getDaysNewestFirst, getStats, getTimeline, getWorld, repoUrl } from '@/features/world-data';
import pageStyles from '../page.module.css';

export const metadata: Metadata = {
  title: 'Logbook',
  description:
    'The chronicle of the garden – yesterday’s weather, what it did and the gardener’s one choice, every day.',
  alternates: { canonical: '/logbook' },
};

export default function LogbookPage() {
  const stats = getStats();
  const world = getWorld();
  const gardens = getTimeline();
  const effectsOf = new Map(world.days.map((d, i) => [d.day, gardens[i]?.effects ?? []]));
  const months = new Map<string, DayEntry[]>();
  for (const entry of getDaysNewestFirst()) {
    const key = formatMonth(entry.date);
    months.set(key, [...(months.get(key) ?? []), entry]);
  }
  return (
    <div className={`${pageStyles.narrow} ${pageStyles.page}`}>
      <SceneDirective camera="far" dim={0.6} />
      <header className={pageStyles.head}>
        <p className="eyebrow">Logbook</p>
        <h1 className="h2">One line a day.</h1>
        <p className="lede">
          The garden&apos;s chronicle, newest day first: the weather, what it did, and the gardener&apos;s one choice.
          It is generated from{' '}
          <a className="link" href={repoUrl('blob/main/world/world.json')}>
            world.json
          </a>{' '}
          and lives in the repository as{' '}
          <a className="link" href={repoUrl('blob/main/LOGBOOK.md')}>
            LOGBOOK.md
          </a>
          .
        </p>
        <div className={pageStyles.stats}>
          <span className="pill">Day {stats.day}</span>
          <span className="pill">{stats.living} living plants</span>
          <span className="pill">{stats.byKind.tree} trees</span>
          <span className="pill">{stats.rainDays} rain days</span>
          <span className="pill">{stats.rainTotal.toFixed(0)} mm of rain</span>
        </div>
      </header>
      <div className={`${pageStyles.panel} glass ${pageStyles.months}`}>
        {[...months.entries()].map(([month, entries]) => (
          <section key={month} className={pageStyles.month} aria-label={month}>
            <h2>{month}</h2>
            <ol className={pageStyles.list} reversed>
              {entries.map((e) => (
                <li key={e.day}>
                  <Link href={`/day/${e.day}`} className={pageStyles.item} transitionTypes={['nav-forward']}>
                    <span className={pageStyles.itemDay}>DAY {String(e.day).padStart(3, '0')}</span>
                    <span aria-hidden="true">{actionEmoji(e)}</span>
                    <span>
                      <ViewTransition name={`day-title-${e.day}`} share="morph" default="none">
                        <strong>{e.title}</strong>
                      </ViewTransition>{' '}
                      <span className="muted">
                        – {e.lore} <span style={{ whiteSpace: 'nowrap' }}>({formatDate(e.date)})</span>
                        {e.source === 'director' ? ' · auto' : ''}
                      </span>
                      {e.weather && (
                        <span className={pageStyles.itemWeather}>
                          {weatherBadge(e).replace(/\*/g, '')} · {(effectsOf.get(e.day) ?? []).join(' ')}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
