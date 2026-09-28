'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { CONDITION_INFO, formatDate, listPlants, SPECIES, weatherLine, type World } from '@/features/garden';
import { gardenPicture, renderGardenSvg, SVG_WIDTH } from '@/features/render';
import { gardensOf, useScene } from '@/features/scene';
import { WeatherIcon } from '@/features/weather';
import { boxesOf, hit, type ElementBox } from './boxes';
import styles from './explorer.module.css';

/**
 * The garden picture for any day: a timeline to scrub or play, hover or tap a plant to read
 * its story. The persistent 3D scene behind follows the selected day.
 */
export function GardenExplorer({ real }: { real: World }) {
  const [source, setSource] = useState<'real' | 'simulation'>(real.days.length < 30 ? 'simulation' : 'real');
  const [sim, setSim] = useState<World | null>(null);
  const world = source === 'simulation' ? (sim ?? null) : real;
  const days = world?.days ?? [];
  const [index, setIndex] = useState(Number.POSITIVE_INFINITY);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<{ box: ElementBox; x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const last = Math.max(0, days.length - 1);
  const i = Math.min(index, last);
  const gardens = useMemo(() => (world ? gardensOf(world) : []), [world]);
  const garden = gardens[i];
  const entry = days[i];

  useEffect(() => {
    if (source !== 'simulation' || sim) return;
    let cancelled = false;
    fetch('/data/simulation.json')
      .then((r) => r.json() as Promise<World>)
      .then((w) => {
        if (cancelled) return;
        useScene.getState().set({ simulation: w });
        setSim(w);
      })
      .catch(() => setSource('real'));
    return () => {
      cancelled = true;
    };
  }, [source, sim]);

  // the 3D scene behind follows the selected day
  useEffect(() => {
    if (!entry) return;
    useScene
      .getState()
      .set({ day: entry.day, source, camera: 'side', dim: 0.72, orbit: false, focus: null, preview: null });
  }, [entry, source]);
  useEffect(() => () => useScene.getState().set({ day: Infinity, source: 'real' }), []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = Math.min(current, last) + 1;
        if (next >= last) setPlaying(false);
        return Math.min(next, last);
      });
    }, 140);
    return () => window.clearInterval(timer);
  }, [playing, last]);

  const svg = useMemo(
    () => (world && garden ? renderGardenSvg(gardenPicture(world, gardens, i), { animated: !playing }) : ''),
    [world, gardens, garden, i, playing],
  );
  const boxes = useMemo(() => (garden ? boxesOf(garden) : []), [garden]);

  const locate = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const scale = SVG_WIDTH / box.width;
    return {
      x: (e.clientX - box.left) * scale,
      y: (e.clientY - box.top) * scale,
      px: e.clientX - box.left,
      py: e.clientY - box.top,
    };
  };

  const pinnedBox = pinned ? boxes.find((b) => b.id === pinned) : undefined;
  const detail = (b: ElementBox) => {
    const origin = days.find((d) => d.day === b.day);
    const plant = garden?.plants.find((p) => p.id === b.id);
    return { origin, plant };
  };

  if (!world || !garden || !entry) {
    return <p className="muted">Loading the garden…</p>;
  }

  const w = entry.weather;
  const living = garden.plants.filter((p) => p.status === 'growing');

  return (
    <div className={styles.explorer}>
      <div className={`${styles.toolbar} glass`}>
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => {
            if (!playing && i >= last) setIndex(0);
            setPlaying(!playing);
          }}
          aria-pressed={playing}
        >
          {playing ? 'Pause' : i >= last ? 'Replay' : 'Play'}
        </button>
        <label className={styles.slider}>
          <span className="visually-hidden">Day</span>
          <input
            type="range"
            min={0}
            max={last}
            value={i}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            aria-valuetext={`Day ${entry.day}, ${formatDate(entry.date)}`}
          />
        </label>
        <span className={styles.dayLabel}>
          Day {entry.day} · {formatDate(entry.date)}
        </span>
        <div className={styles.sourceSwitch} role="group" aria-label="Which garden">
          <button type="button" aria-pressed={source === 'real'} onClick={() => setSource('real')}>
            Real
          </button>
          <button type="button" aria-pressed={source === 'simulation'} onClick={() => setSource('simulation')}>
            Simulated year
          </button>
        </div>
      </div>

      <div
        ref={frame}
        className={`${styles.frame} glass`}
        onPointerMove={(e) => {
          const p = locate(e);
          const b = hit(boxes, p.x, p.y);
          setHover(b ? { box: b, x: p.px, y: p.py } : null);
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const p = locate(e);
          setPinned(hit(boxes, p.x, p.y)?.id ?? null);
        }}
      >
        {source === 'simulation' && <span className={styles.simBadge}>SIMULATION · real weather 2025/26</span>}
        <div className={styles.picture} dangerouslySetInnerHTML={{ __html: svg }} />
        {hover && (
          <div
            className={`${styles.tip} glass glass-strong`}
            style={{ left: hover.x + 14, top: hover.y + 14 }}
            role="status"
          >
            <strong>{hover.box.label}</strong>
            <span>
              {hover.box.kind === 'plant' ? 'planted' : 'built'} on day {hover.box.day}
            </span>
            <span className="muted">{detail(hover.box).origin?.title}</span>
          </div>
        )}
      </div>

      <div className={styles.panels}>
        <section className={`${styles.panel} glass`} aria-label="The selected day">
          <p className="eyebrow">
            Day {entry.day} · {formatDate(entry.date)}
          </p>
          <h2 className={styles.panelTitle}>{entry.title}</h2>
          <p className="muted">{entry.lore}</p>
          {w && (
            <p className={styles.weather}>
              <WeatherIcon condition={w.condition} size={20} />
              <span>
                <strong>{CONDITION_INFO[w.condition].motto}</strong> {weatherLine(w)}
              </span>
            </p>
          )}
          {garden.effects.length > 0 && (
            <ul className={styles.effects}>
              {garden.effects.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {source === 'real' && (
            <Link className="link" href={`/day/${entry.day}`}>
              Open day {entry.day} →
            </Link>
          )}
        </section>
        <section className={`${styles.panel} glass`} aria-label="In the garden">
          {pinnedBox ? (
            (() => {
              const { origin, plant } = detail(pinnedBox);
              return (
                <>
                  <p className="eyebrow">Selected · {pinnedBox.kind}</p>
                  <h2 className={styles.panelTitle}>{pinnedBox.label}</h2>
                  {plant && (
                    <p className="muted">
                      Stage {plant.stage} of {SPECIES[plant.species].maxStage}
                      {plant.bloom ? ` · ${plant.bloom} blossoms` : ''}
                      {plant.fruit ? ` · ${plant.fruit} ${SPECIES[plant.species].fruit?.label ?? 'fruit'}` : ''}
                      {plant.status !== 'growing' ? ` · ${plant.status}` : ''}
                    </p>
                  )}
                  {origin && (
                    <p>
                      Day {origin.day}: <strong>{origin.title}</strong> – {origin.lore}
                    </p>
                  )}
                  <button type="button" className="link" onClick={() => setPinned(null)}>
                    Clear selection
                  </button>
                </>
              );
            })()
          ) : (
            <>
              <p className="eyebrow">In the garden</p>
              <h2 className={styles.panelTitle}>
                {living.length} living {living.length === 1 ? 'plant' : 'plants'}
              </h2>
              <p className="muted">{living.length ? listPlants(living) : 'Nothing has been planted yet.'}</p>
              <p className="muted">
                {garden.structures.length} {garden.structures.length === 1 ? 'thing' : 'things'} built · stream level{' '}
                {garden.nature.water}
                {garden.nature.ice ? ' (frozen)' : ''}
                {garden.nature.snow ? ` · snow ${garden.nature.snow}/3` : ''}
              </p>
              <p className={styles.hint}>Hover a plant to see when it arrived – click to pin it.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
