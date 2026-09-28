'use client';

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { addDays, formatDate, type Weather } from '@/features/garden';
import { CONDITION_LABEL, WeatherIcon } from './icons';
import { rainBin, RAIN_BINS } from './summary';
import styles from './weather.module.css';

/**
 * Rain as a contribution graph: one cell per day, weeks as columns, one blue ramp from dry
 * to wet. Hover or arrow keys show the day; the table view below carries every value.
 */

const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;
const TOP = 18;
const LEFT = 26;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function weekday(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
}

export function RainCalendar({ days, label }: { days: readonly Weather[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const layout = useMemo(() => {
    const first = days[0];
    if (!first) return { cells: [], weeks: 0, months: [] as { x: number; name: string }[] };
    const start = addDays(first.date, -weekday(first.date));
    const cells = days.map((w, i) => {
      const offset = Math.round((Date.parse(`${w.date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
      return { w, i, col: Math.floor(offset / 7), row: offset % 7 };
    });
    const months: { x: number; name: string }[] = [];
    let lastMonth = -1;
    for (const c of cells) {
      const month = Number(c.w.date.slice(5, 7)) - 1;
      if (month !== lastMonth && c.row <= 3) {
        const x = LEFT + c.col * STEP;
        const previous = months[months.length - 1];
        // two month starts in neighbouring weeks: keep the later one
        if (previous && x - previous.x < 28) months.pop();
        months.push({ x, name: MONTHS[month] ?? '' });
        lastMonth = month;
      }
    }
    return { cells, weeks: (cells[cells.length - 1]?.col ?? 0) + 1, months };
  }, [days]);

  const width = LEFT + layout.weeks * STEP;
  const height = TOP + 7 * STEP;
  const current = active !== null ? layout.cells[active] : undefined;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width - LEFT;
    const y = ((e.clientY - box.top) / box.height) * height - TOP;
    const col = Math.floor(x / STEP);
    const row = Math.floor(y / STEP);
    const hit = layout.cells.findIndex((c) => c.col === col && c.row === row);
    setActive(hit >= 0 ? hit : null);
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const move = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (move === undefined) return;
    e.preventDefault();
    const from = active ?? layout.cells.length - 1;
    setActive(Math.max(0, Math.min(layout.cells.length - 1, from + move)));
  };

  return (
    <figure className={styles.calendar}>
      <div className={styles.calendarScroll}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className={styles.calendarSvg}
          role="img"
          aria-label={`${label}: rain per day as a calendar, ${days.length} days. Use the table below for every value.`}
          tabIndex={0}
          onPointerMove={pick}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {layout.months.map((m) => (
            <text key={`${m.x}${m.name}`} x={m.x} y={11} className={styles.axisText}>
              {m.name}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} x={0} y={TOP + (i * 2 + 1) * STEP - 3} className={styles.axisText}>
              {d}
            </text>
          ))}
          {layout.cells.map((c) => (
            <rect
              key={c.w.date}
              x={LEFT + c.col * STEP}
              y={TOP + c.row * STEP}
              width={CELL}
              height={CELL}
              rx={3}
              className={styles[`bin${rainBin(c.w.rain)}`]}
              data-active={active === c.i ? '' : undefined}
            />
          ))}
        </svg>
      </div>
      <div className={styles.calendarFoot}>
        <span className={styles.legend} aria-hidden="true">
          <span>dry</span>
          <i className={styles.bin0} />
          <i className={styles.bin1} />
          <i className={styles.bin2} />
          <i className={styles.bin3} />
          <i className={styles.bin4} />
          <span>≥ {RAIN_BINS[3]} mm</span>
        </span>
        <span className={styles.readout} aria-live="polite">
          {current ? (
            <>
              <WeatherIcon condition={current.w.condition} size={16} />
              <strong>{current.w.rain.toFixed(1)} mm</strong>
              <span>
                {CONDITION_LABEL[current.w.condition]} · {formatDate(current.w.date)} · {Math.round(current.w.tmin)}° /{' '}
                {Math.round(current.w.tmax)}°
              </span>
            </>
          ) : (
            <span className="muted">Hover a day – or focus the calendar and use the arrow keys.</span>
          )}
        </span>
      </div>
    </figure>
  );
}
