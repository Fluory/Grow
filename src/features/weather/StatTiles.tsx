import { formatDate, type Weather } from '@/features/garden';
import { WeatherIcon } from './icons';
import { summarize } from './summary';
import styles from './weather.module.css';

const deg = (n: number) => `${n.toFixed(1).replace('-', '−')} °C`;

/** The headline numbers of a run of days – a row of stat tiles, not a chart. */
export function StatTiles({ days }: { days: readonly Weather[] }) {
  const s = summarize(days);
  const tiles = [
    {
      label: 'Rain days',
      value: String(s.counts.rain),
      note: `${s.rainTotal.toFixed(0)} mm in total`,
      icon: 'rain' as const,
    },
    { label: 'Sunny days', value: String(s.counts.sun), note: `${s.sunHours} hours of sunshine`, icon: 'sun' as const },
    {
      label: 'Frost and snow',
      value: String(s.counts.frost + s.counts.snow),
      note: `${s.counts.snow} of them with snow`,
      icon: 'frost' as const,
    },
    {
      label: 'Storm days',
      value: String(s.counts.storm),
      note: s.windiest ? `gusts up to ${Math.round(s.windiest.gust)} km/h` : '–',
      icon: 'storm' as const,
    },
    {
      label: 'Warmest',
      value: s.warmest ? deg(s.warmest.tmax) : '–',
      note: s.warmest ? formatDate(s.warmest.date) : '',
      icon: 'sun' as const,
    },
    {
      label: 'Coldest',
      value: s.coldest ? deg(s.coldest.tmin) : '–',
      note: s.coldest ? formatDate(s.coldest.date) : '',
      icon: 'frost' as const,
    },
  ];
  return (
    <ul className={styles.tiles}>
      {tiles.map((t) => (
        <li key={t.label} className={`${styles.tile} glass`}>
          <span className={styles.tileLabel}>
            <WeatherIcon condition={t.icon} size={16} /> {t.label}
          </span>
          <span className={styles.tileValue}>{t.value}</span>
          <span className={styles.tileNote}>{t.note}</span>
        </li>
      ))}
    </ul>
  );
}
