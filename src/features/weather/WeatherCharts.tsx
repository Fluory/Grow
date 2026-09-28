'use client';

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { addDays, CONDITIONS, formatDate, type Condition, type Weather } from '@/features/garden';
import { CONDITION_LABEL, WeatherIcon } from './icons';
import { useWidth } from './useWidth';
import styles from './weather.module.css';

/**
 * Two small multiples on one shared time axis – never one chart with two y-scales:
 * precipitation as columns, and the temperature range (night minimum to day maximum) as
 * floating bars. A shared crosshair shows every value of the hovered day or week.
 */

interface Bucket {
  from: string;
  to: string;
  rain: number;
  tmin: number;
  tmax: number;
  counts: Record<Condition, number>;
}

function weekStart(date: string): string {
  const day = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -day);
}

function bucketize(days: readonly Weather[], by: 'day' | 'week'): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const w of days) {
    const key = by === 'week' ? weekStart(w.date) : w.date;
    let b = map.get(key);
    if (!b) {
      b = {
        from: w.date,
        to: w.date,
        rain: 0,
        tmin: Infinity,
        tmax: -Infinity,
        counts: { sun: 0, cloudy: 0, rain: 0, frost: 0, snow: 0, storm: 0 },
      };
      map.set(key, b);
    }
    b.to = w.date;
    b.rain += w.rain;
    b.tmin = Math.min(b.tmin, w.tmin);
    b.tmax = Math.max(b.tmax, w.tmax);
    b.counts[w.condition]++;
  }
  return [...map.values()].map((b) => ({ ...b, rain: Math.round(b.rain * 10) / 10 }));
}

function niceStep(max: number, ticks: number): number {
  const raw = max / ticks;
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-6)));
  const n = raw / power;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power;
}

const LEFT = 44;
const RIGHT = 12;
const RAIN_H = 148;
const TEMP_H = 178;
const PAD_TOP = 18;
const AXIS = 24;

const fmtDeg = (n: number) => `${Math.round(n)}°`.replace('-', '−');

export function WeatherCharts({ days, by = 'week' }: { days: readonly Weather[]; by?: 'day' | 'week' }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const buckets = useMemo(() => bucketize(days, by), [days, by]);

  const n = Math.max(1, buckets.length);
  const plotW = Math.max(120, width - LEFT - RIGHT);
  const band = plotW / n;
  const bar = Math.max(1, Math.min(24, band - 2));
  const cx = (i: number) => LEFT + band * (i + 0.5);

  const rainMax = Math.max(1, ...buckets.map((b) => b.rain));
  const rainStep = niceStep(rainMax, 3);
  const rainTop = Math.ceil(rainMax / rainStep) * rainStep;
  const rainPlot = RAIN_H - PAD_TOP - 8;
  const ry = (v: number) => PAD_TOP + rainPlot * (1 - v / rainTop);

  const tLow = Math.floor(Math.min(0, ...buckets.map((b) => b.tmin)) / 5) * 5;
  const tHigh = Math.ceil(Math.max(10, ...buckets.map((b) => b.tmax)) / 5) * 5;
  const tempPlot = TEMP_H - PAD_TOP - AXIS;
  const ty = (v: number) => PAD_TOP + tempPlot * (1 - (v - tLow) / (tHigh - tLow));

  const wettest = buckets.reduce((best, b, i) => (b.rain > (buckets[best]?.rain ?? -1) ? i : best), 0);
  const warmest = buckets.reduce((best, b, i) => (b.tmax > (buckets[best]?.tmax ?? -Infinity) ? i : best), 0);
  const coldest = buckets.reduce((best, b, i) => (b.tmin < (buckets[best]?.tmin ?? Infinity) ? i : best), 0);

  const months = useMemo(() => {
    const out: { i: number; name: string }[] = [];
    let last = '';
    buckets.forEach((b, i) => {
      const m = b.to.slice(0, 7);
      if (m !== last) {
        out.push({ i, name: formatDate(b.to).split(' ')[1] ?? '' });
        last = m;
      }
    });
    return out;
  }, [buckets]);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left - LEFT) / band);
    setHover(i >= 0 && i < buckets.length ? i : null);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!move) return;
    e.preventDefault();
    setHover((h) => Math.max(0, Math.min(buckets.length - 1, (h ?? buckets.length - 1) + move)));
  };

  const current = hover !== null ? buckets[hover] : undefined;
  const rainTicks = Array.from({ length: Math.round(rainTop / rainStep) + 1 }, (_, k) => k * rainStep);
  const tempTicks: number[] = [];
  for (let t = tLow; t <= tHigh; t += 10) tempTicks.push(t);
  if (!tempTicks.includes(0) && tLow < 0) tempTicks.push(0);
  const period = by === 'week' ? 'week' : 'day';

  return (
    <div
      ref={ref}
      className={styles.charts}
      onPointerMove={pick}
      onPointerLeave={() => setHover(null)}
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
      role="group"
      aria-label={`Rain and temperature per ${period}. Use the arrow keys to read a ${period}; the table below lists every day.`}
    >
      <p className={styles.chartTitle}>Rain per {period} · mm</p>
      <svg width={width} height={RAIN_H} className={styles.chartSvg} aria-hidden="true">
        {rainTicks.map((t) => (
          <g key={t}>
            <line
              x1={LEFT}
              x2={width - RIGHT}
              y1={ry(t)}
              y2={ry(t)}
              className={t === 0 ? styles.baseline : styles.grid}
            />
            <text x={LEFT - 8} y={ry(t) + 4} textAnchor="end" className={styles.axisText}>
              {t}
            </text>
          </g>
        ))}
        {buckets.map((b, i) =>
          b.rain > 0 ? (
            <path
              key={b.from}
              className={styles.rainBar}
              data-active={hover === i ? '' : undefined}
              d={(() => {
                const x = cx(i) - bar / 2;
                const y = ry(b.rain);
                const h = ry(0) - y;
                const r = Math.min(4, bar / 2, h);
                return `M${x} ${ry(0)}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bar - r}Q${x + bar} ${y} ${x + bar} ${y + r}V${ry(0)}Z`;
              })()}
            />
          ) : null,
        )}
        {buckets[wettest] && buckets[wettest].rain > 0 && (
          <text x={cx(wettest)} y={ry(buckets[wettest].rain) - 6} textAnchor="middle" className={styles.valueText}>
            {buckets[wettest].rain.toFixed(1)} mm
          </text>
        )}
        {hover !== null && (
          <line x1={cx(hover)} x2={cx(hover)} y1={PAD_TOP - 6} y2={RAIN_H} className={styles.crosshair} />
        )}
      </svg>

      <p className={styles.chartTitle}>Temperature per {period} · night minimum to day maximum, °C</p>
      <svg width={width} height={TEMP_H} className={styles.chartSvg} aria-hidden="true">
        {tempTicks.map((t) => (
          <g key={t}>
            <line
              x1={LEFT}
              x2={width - RIGHT}
              y1={ty(t)}
              y2={ty(t)}
              className={t === 0 ? styles.freezing : styles.grid}
            />
            <text x={LEFT - 8} y={ty(t) + 4} textAnchor="end" className={styles.axisText}>
              {fmtDeg(t)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const w = Math.max(2, Math.min(8, bar * 0.55));
          const y1 = ty(b.tmax);
          const y2 = ty(b.tmin);
          return (
            <rect
              key={b.from}
              x={cx(i) - w / 2}
              y={y1}
              width={w}
              height={Math.max(2, y2 - y1)}
              rx={Math.min(3, w / 2)}
              className={styles.tempBar}
              data-active={hover === i ? '' : undefined}
            />
          );
        })}
        {buckets[warmest] && (
          <text x={cx(warmest)} y={ty(buckets[warmest].tmax) - 6} textAnchor="middle" className={styles.valueText}>
            {fmtDeg(buckets[warmest].tmax)}
          </text>
        )}
        {buckets[coldest] && (
          <text x={cx(coldest)} y={ty(buckets[coldest].tmin) + 16} textAnchor="middle" className={styles.valueText}>
            {fmtDeg(buckets[coldest].tmin)}
          </text>
        )}
        {months.map((m) => (
          <text key={`${m.i}${m.name}`} x={LEFT + band * m.i} y={TEMP_H - 6} className={styles.axisText}>
            {m.name}
          </text>
        ))}
        {hover !== null && (
          <line x1={cx(hover)} x2={cx(hover)} y1={0} y2={TEMP_H - AXIS + 4} className={styles.crosshair} />
        )}
      </svg>

      {current && hover !== null && (
        <div
          className={`${styles.tooltip} glass glass-strong`}
          style={{ left: Math.min(Math.max(8, cx(hover) + 14), width - 220), top: 30 }}
          role="status"
        >
          <p className={styles.tipHead}>
            {by === 'week' ? `${formatDate(current.from)} – ${formatDate(current.to)}` : formatDate(current.from)}
          </p>
          <p className={styles.tipRow}>
            <i className={styles.keyRain} />
            <strong>{current.rain.toFixed(1)} mm</strong> rain
          </p>
          <p className={styles.tipRow}>
            <i className={styles.keyTemp} />
            <strong>
              {fmtDeg(current.tmin)} … {fmtDeg(current.tmax)}
            </strong>
          </p>
          <p className={styles.tipConditions}>
            {CONDITIONS.filter((c) => current.counts[c] > 0).map((c) => (
              <span key={c}>
                <WeatherIcon condition={c} size={14} /> {current.counts[c]} {CONDITION_LABEL[c].toLowerCase()}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
