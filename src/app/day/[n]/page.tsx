import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import { CONDITION_INFO, formatDate, gardenStats, weatherLine, type DayEntry } from '@/features/garden';
import { actionEmoji } from '@/features/logbook';
import { gardenPicture, renderGardenSvg } from '@/features/render';
import { SceneDirective } from '@/features/scene';
import { WeatherIcon } from '@/features/weather';
import { getDay, getTimeline, getWorld, repoUrl } from '@/features/world-data';
import pageStyles from '../../page.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return getWorld().days.map((d) => ({ n: String(d.day) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const entry = getDay(Number(n));
  if (!entry) return {};
  return {
    title: `Day ${entry.day}: ${entry.title}`,
    description: entry.lore,
    alternates: { canonical: `/day/${entry.day}` },
  };
}

function actionLabel(entry: DayEntry): string {
  switch (entry.action) {
    case 'genesis':
      return 'Genesis';
    case 'plant':
      return 'Planted';
    case 'build':
      return 'Built';
    case 'water':
      return 'Watered';
    case 'harvest':
      return 'Harvested';
    case 'rest':
      return 'Rested';
  }
}

export default async function DayPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const entry = getDay(Number(n));
  if (!entry) notFound();
  const world = getWorld();
  const gardens = getTimeline();
  const index = world.days.findIndex((d) => d.day === entry.day);
  const garden = gardens[index];
  const stats = gardenStats({ ...world, days: world.days.slice(0, index + 1) }, garden);
  const svg = renderGardenSvg(gardenPicture(world, gardens, index), { caption: false });
  const prev = world.days[index - 1];
  const next = world.days[index + 1];
  const w = entry.weather;
  const focus = entry.x !== undefined && entry.row !== undefined ? { x: entry.x, row: entry.row } : null;

  return (
    <div className={`container ${pageStyles.page}`}>
      <SceneDirective camera={focus ? 'focus' : 'overview'} focus={focus} day={entry.day} dim={0.45} orbit={false} />
      <div className={pageStyles.dayHero}>
        <header className={pageStyles.head}>
          <p className="eyebrow">
            Day {entry.day} · {formatDate(entry.date)} · {actionLabel(entry)}
          </p>
          <ViewTransition name={`day-title-${entry.day}`} share="morph" default="none">
            <h1 className="h2">
              <span aria-hidden="true">{actionEmoji(entry)}</span> {entry.title}
            </h1>
          </ViewTransition>
          <p className="lede">{entry.lore}</p>
          {w && (
            <div className={`${pageStyles.dayWeather} glass`}>
              <p className={pageStyles.dayWeatherHead}>
                <WeatherIcon condition={w.condition} size={22} />
                <strong>{CONDITION_INFO[w.condition].motto}</strong>
              </p>
              <p className="muted">
                {formatDate(w.date)} in Heilbronn: {weatherLine(w)}
              </p>
              {garden && garden.effects.length > 0 && (
                <ul className={pageStyles.dayEffects}>
                  {garden.effects.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className={pageStyles.stats}>
            <span className="pill">{stats.living} living plants</span>
            <span className="pill">{stats.structures} things built</span>
            <span className="pill">stream level {garden?.nature.water ?? 0}</span>
            <span className="pill">
              {entry.source === 'director'
                ? 'chosen by the director'
                : entry.source === 'claude'
                  ? 'chosen by Claude'
                  : 'genesis'}
            </span>
          </div>
          <p>
            <a className="btn btn-ghost" href={repoUrl(`commits/main/world/world.json`)}>
              See the commits <span className="arrow">→</span>
            </a>
          </p>
        </header>
        <div className={`${pageStyles.dayImage} glass`} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <nav className={pageStyles.dayNav} aria-label="Neighbouring days">
        {prev ? (
          <Link className="btn btn-ghost" href={`/day/${prev.day}`} transitionTypes={['nav-back']}>
            ← Day {prev.day}
          </Link>
        ) : (
          <span />
        )}
        <Link className="btn btn-ghost" href="/logbook">
          Logbook
        </Link>
        {next ? (
          <Link className="btn btn-ghost" href={`/day/${next.day}`} transitionTypes={['nav-forward']}>
            Day {next.day} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
