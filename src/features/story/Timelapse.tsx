'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { describeWeather, formatDate, type World } from '@/features/garden';
import { gardensOf, useScene } from '@/features/scene';
import { CONDITION_LABEL, WeatherIcon } from '@/features/weather';
import styles from './Timelapse.module.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MIN_REAL_DAYS = 30;

/**
 * The centre piece: scroll to replay the garden day by day, weather and all. While the real
 * garden is younger than a month, the section shows a clearly labelled simulated year – the
 * same rules under a real past year of Heilbronn weather – and one click switches back.
 */
export function Timelapse({ real }: { real: World }) {
  const realLast = real.days[real.days.length - 1]?.day ?? 0;
  const [source, setSource] = useState<'real' | 'simulation'>(realLast < MIN_REAL_DAYS ? 'simulation' : 'real');
  const [sim, setSim] = useState<World | null>(null);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  const world = source === 'simulation' ? sim : real;
  const days = useMemo(() => world?.days ?? [], [world]);
  const gardens = useMemo(() => (world ? gardensOf(world) : []), [world]);
  const last = days[days.length - 1]?.day ?? 0;

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

  const direct = useCallback(
    (progress: number) => {
      const d = Math.round(progress * last);
      let i = 0;
      while (i + 1 < days.length && (days[i + 1]?.day ?? 0) <= d) i++;
      setIndex(i);
      if (fill.current) fill.current.style.transform = `scaleX(${progress})`;
      useScene.getState().set({
        day: d,
        source,
        camera: 'hero',
        dim: 0,
        shift: 0,
        shiftY: window.innerWidth > 900 ? -0.12 : -0.16,
        orbit: true,
        focus: null,
        preview: null,
      });
    },
    [last, source, days],
  );

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onToggle: (self) => {
          active.current = self.isActive;
          if (self.isActive) direct(self.progress);
          else useScene.getState().set({ day: Infinity, source: 'real' });
        },
        onUpdate: (self) => {
          if (active.current) direct(self.progress);
        },
      });
    },
    { scope: root, dependencies: [direct] },
  );

  const entry = days[index];
  const garden = gardens[index];
  const w = entry?.weather;
  const ribbon = useMemo(() => days.slice(1).map((d) => d.weather?.rain ?? 0), [days]);
  const ribbonMax = Math.max(8, ...ribbon);

  return (
    <section ref={root} className={styles.lapse} aria-labelledby="lapse-title">
      <div className={styles.lapseSticky}>
        <div className={`container ${styles.lapseInner}`}>
          <div className={`${styles.lapseCard} glass`}>
            <h2 id="lapse-title" className="eyebrow">
              {source === 'simulation' ? 'Timelapse · a simulated year' : 'Timelapse · the real garden'}
            </h2>
            <p className={styles.counter} aria-live="polite" aria-atomic="true">
              <span className={styles.counterLabel}>Day</span>
              {String(entry?.day ?? 0).padStart(3, '0')}
            </p>
            {entry && <p className={styles.counterDate}>{formatDate(entry.date)}</p>}
            <p className={styles.weatherChip}>
              {w ? (
                <>
                  <WeatherIcon condition={w.condition} size={18} />
                  <strong>{CONDITION_LABEL[w.condition]}</strong> {describeWeather(w).replace(/^\S+ /, '')}
                </>
              ) : (
                <>
                  <WeatherIcon condition="sun" size={18} /> <strong>Genesis</strong> an empty bed
                </>
              )}
            </p>
            <div className={styles.lapseTrack} aria-hidden="true">
              <svg
                className={styles.ribbon}
                viewBox={`0 0 ${Math.max(1, ribbon.length)} 20`}
                preserveAspectRatio="none"
              >
                {ribbon.map((mm, i) =>
                  mm > 0.1 ? (
                    <rect key={i} x={i} y={20 - (mm / ribbonMax) * 20} width={0.8} height={(mm / ribbonMax) * 20} />
                  ) : null,
                )}
              </svg>
              <div ref={fill} className={styles.lapseFill} style={{ transform: 'scaleX(0)' }} />
            </div>
            <div className={styles.simNote}>
              {source === 'simulation' ? (
                <>
                  <span className={styles.simBadge}>SIMULATION</span>
                  <span>
                    The real garden is {realLast} {realLast === 1 ? 'day' : 'days'} old. This year uses the same rules
                    and the real Heilbronn weather of 2025/26.
                  </span>
                  <button type="button" className={styles.switch} onClick={() => setSource('real')}>
                    Show the real garden
                  </button>
                </>
              ) : (
                <>
                  <span>Scroll to replay every day since the empty bed.</span>
                  <button type="button" className={styles.switch} onClick={() => setSource('simulation')}>
                    Show a simulated year
                  </button>
                </>
              )}
            </div>
          </div>
          <div className={`${styles.caption} glass`}>
            {entry ? (
              <>
                <p className="eyebrow">Day {entry.day}</p>
                <p className={styles.captionTitle}>{entry.title}</p>
                <p className="muted">{entry.lore}</p>
                {garden && garden.effects.length > 0 && <p className={styles.effects}>{garden.effects[0]}</p>}
              </>
            ) : (
              <p className="muted">Loading the garden…</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
