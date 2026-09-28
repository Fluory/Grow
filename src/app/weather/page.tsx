import type { Metadata } from 'next';
import { CONDITION_INFO, formatDate, THRESHOLDS, type Condition, type Weather } from '@/features/garden';
import { SceneDirective } from '@/features/scene';
import { RainCalendar, StatTiles, WeatherCharts, WeatherIcon, WeatherTable } from '@/features/weather';
import { getWeatherYear, getWorld } from '@/features/world-data';
import pageStyles from '../page.module.css';
import styles from './weather.module.css';

export const metadata: Metadata = {
  title: 'Weather record',
  description:
    'The real weather in Heilbronn that grows the garden – rain, sun, frost and storm, day by day, from Open-Meteo.',
  alternates: { canonical: '/weather' },
};

const ORDER: Condition[] = ['storm', 'snow', 'frost', 'rain', 'sun', 'cloudy'];
const LIMITS: Record<Condition, string> = {
  storm: `gusts ≥ ${THRESHOLDS.stormGust} km/h or wind ≥ ${THRESHOLDS.stormWind} km/h`,
  snow: `≥ ${THRESHOLDS.snow} cm fresh snow`,
  frost: `night below ${THRESHOLDS.frost} °C`,
  rain: `≥ ${THRESHOLDS.rain} mm`,
  sun: `≥ ${THRESHOLDS.sun} h sunshine`,
  cloudy: 'anything else',
};

export default function WeatherPage() {
  const recorded = getWorld()
    .days.map((d) => d.weather)
    .filter((w): w is Weather => Boolean(w));
  const year = getWeatherYear();
  const first = year[0];
  const last = year[year.length - 1];

  return (
    <div className={`container ${pageStyles.page}`}>
      <SceneDirective camera="far" dim={0.82} />
      <header className={pageStyles.head}>
        <p className="eyebrow">Weather record · Heilbronn</p>
        <h1 className="h2">The only boss of the garden.</h1>
        <p className="lede">
          Every morning the routine asks Open-Meteo for yesterday&apos;s weather at 49.14° N, 9.21° E and turns it into
          one of six conditions. Nobody chooses it, nobody can change it – the garden simply has to live with it.
        </p>
      </header>

      <section className={styles.block} aria-labelledby="record-title">
        <h2 id="record-title" className="h3">
          Since the garden began
        </h2>
        {recorded.length === 0 ? (
          <p className={`${styles.card} glass muted`}>
            The garden was planted on {formatDate(getWorld().genesis)}. The first weather arrives with the first daily
            commit – until then, the reference year below shows what Heilbronn usually brings.
          </p>
        ) : (
          <>
            <StatTiles days={recorded} />
            <div className={`${styles.card} glass`}>
              <RainCalendar days={recorded} label="Heilbronn since the garden began" />
              <WeatherCharts days={recorded} by={recorded.length > 70 ? 'week' : 'day'} />
              <WeatherTable days={recorded} caption="Weather recorded by the daily routine" />
            </div>
          </>
        )}
      </section>

      <section className={styles.block} aria-labelledby="year-title">
        <h2 id="year-title" className="h3">
          A reference year · {first ? formatDate(first.date) : ''} – {last ? formatDate(last.date) : ''}
        </h2>
        <p className="muted">
          The {year.length} days before the garden, from the Open-Meteo archive (ERA5). The simulated year on the home
          page grew under exactly this weather.
        </p>
        <StatTiles days={year} />
        <div className={`${styles.card} glass`}>
          <RainCalendar days={year} label="Heilbronn 2025/26" />
          <WeatherCharts days={year} by="week" />
          <WeatherTable days={year} caption="Heilbronn reference year" />
        </div>
      </section>

      <section className={styles.block} aria-labelledby="rules-title">
        <h2 id="rules-title" className="h3">
          How a day becomes one condition
        </h2>
        <p className="muted">Checked in this order – the first match is the day&apos;s weather.</p>
        <ol className={styles.conditions}>
          {ORDER.map((c) => (
            <li key={c} className={`${styles.condition} glass`}>
              <WeatherIcon condition={c} size={26} />
              <div>
                <p>
                  <strong>{CONDITION_INFO[c].label}</strong> <span className={styles.limit}>{LIMITS[c]}</span>
                </p>
                <p className="muted">{CONDITION_INFO[c].effect}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className={styles.credit}>
        Weather data by{' '}
        <a className="link" href="https://open-meteo.com/">
          Open-Meteo.com
        </a>{' '}
        (CC BY 4.0) – forecast API for the daily routine, historical API (ERA5) for the reference year.
      </p>
    </div>
  );
}
